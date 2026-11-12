import { execute, query } from '../config/db';
import { assertSubjectAccess } from '../utils/materials';
import { ApiError, asyncHandler, ok } from '../utils/http';

interface TopicRow {
  id: number;
  subject_id: number;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

interface MaterialRow {
  id: number;
  topic_id: number;
  kind: 'lecture' | 'presentation' | 'other';
  title: string;
  file_name: string;
  size: number;
  created_at: string;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
}

// Fanlar bo'yicha mavzular va ularning materiallari (fayl ma'lumotining o'zi o'qilmaydi)
async function loadTopics(subjectIds: number[]): Promise<Map<number, (TopicRow & { materials: MaterialRow[] })[]>> {
  const result = new Map<number, (TopicRow & { materials: MaterialRow[] })[]>();
  subjectIds.forEach((id) => result.set(id, []));
  if (!subjectIds.length) return result;

  const topics = await query<TopicRow>(
    `SELECT id, subject_id, title, description, sort_order, created_at
     FROM topics WHERE subject_id IN (?) ORDER BY sort_order, id`,
    [subjectIds]
  );
  const materials = topics.length
    ? await query<MaterialRow>(
        `SELECT m.id, m.topic_id, m.kind, m.title, m.file_name, m.size, m.created_at,
                m.uploaded_by, u.full_name AS uploaded_by_name
         FROM materials m LEFT JOIN users u ON u.id = m.uploaded_by
         WHERE m.topic_id IN (?) ORDER BY m.id`,
        [topics.map((t) => t.id)]
      )
    : [];

  const byTopic = new Map<number, MaterialRow[]>();
  for (const m of materials) {
    const list = byTopic.get(m.topic_id) ?? [];
    list.push({ ...m, size: Number(m.size) });
    byTopic.set(m.topic_id, list);
  }
  for (const t of topics) {
    result.get(t.subject_id)!.push({ ...t, materials: byTopic.get(t.id) ?? [] });
  }
  return result;
}

// Bitta fan: mavzular ro'yxati
export const listBySubject = asyncHandler(async (req, res) => {
  const subjectId = Number(req.params.subjectId);
  await assertSubjectAccess(req.user!, subjectId, false);
  const [subject] = await query<{ id: number; name: string }>('SELECT id, name FROM subjects WHERE id = ?', [subjectId]);
  const topics = (await loadTopics([subjectId])).get(subjectId) ?? [];
  ok(res, { subject, can_manage: req.user!.role !== 'student', topics });
});

// Ustoz va talaba uchun: o'ziga tegishli barcha fanlar va mavzulari
export const myList = asyncHandler(async (req, res) => {
  const user = req.user!;
  const subjects =
    user.role === 'teacher'
      ? await query<{ id: number; name: string }>(
          `SELECT s.id, s.name FROM subjects s WHERE s.id IN (
             SELECT subject_id FROM \`groups\` WHERE teacher_id = ?
             UNION SELECT subject_id FROM teacher_subjects WHERE teacher_id = ?)
           ORDER BY s.name`,
          [user.id, user.id]
        )
      : await query<{ id: number; name: string }>(
          `SELECT DISTINCT s.id, s.name FROM group_students gs
           JOIN \`groups\` g ON g.id = gs.group_id
           JOIN subjects s ON s.id = g.subject_id
           WHERE gs.student_id = ? ORDER BY s.name`,
          [user.id]
        );

  const topics = await loadTopics(subjects.map((s) => s.id));
  ok(
    res,
    subjects.map((s) => ({
      subject_id: s.id,
      subject_name: s.name,
      can_manage: user.role === 'teacher',
      topics: topics.get(s.id) ?? [],
    }))
  );
});

export const create = asyncHandler(async (req, res) => {
  const subjectId = Number(req.params.subjectId);
  await assertSubjectAccess(req.user!, subjectId, true);
  const { title, description } = req.body as { title: string; description?: string | null };

  const dup = await query('SELECT 1 FROM topics WHERE subject_id = ? AND title = ?', [subjectId, title]);
  if (dup.length) throw new ApiError(409, 'Bu fanda bunday nomli mavzu allaqachon bor');

  const [{ next }] = await query<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM topics WHERE subject_id = ?',
    [subjectId]
  );
  const result = await execute(
    'INSERT INTO topics (subject_id, title, description, sort_order, created_by) VALUES (?, ?, ?, ?, ?)',
    [subjectId, title, description || null, next, req.user!.id]
  );
  ok(res, { id: result.insertId, subject_id: subjectId, title, description: description || null, materials: [] }, "Mavzu qo'shildi", 201);
});

async function findTopic(topicId: number) {
  const rows = await query<{ id: number; subject_id: number }>('SELECT id, subject_id FROM topics WHERE id = ?', [topicId]);
  if (!rows.length) throw new ApiError(404, 'Mavzu topilmadi');
  return rows[0];
}

export const update = asyncHandler(async (req, res) => {
  const topic = await findTopic(Number(req.params.id));
  await assertSubjectAccess(req.user!, topic.subject_id, true);
  const { title, description } = req.body as { title: string; description?: string | null };

  const dup = await query('SELECT 1 FROM topics WHERE subject_id = ? AND title = ? AND id <> ?', [topic.subject_id, title, topic.id]);
  if (dup.length) throw new ApiError(409, 'Bu fanda bunday nomli mavzu allaqachon bor');

  await execute('UPDATE topics SET title = ?, description = ? WHERE id = ?', [title, description || null, topic.id]);
  ok(res, { id: topic.id, title, description: description || null }, 'Mavzu yangilandi');
});

export const remove = asyncHandler(async (req, res) => {
  const user = req.user!;
  const topic = await findTopic(Number(req.params.id));
  await assertSubjectAccess(user, topic.subject_id, true);

  // Ustoz boshqalar yuklagan materiallari bor mavzuni o'chira olmaydi
  if (user.role === 'teacher') {
    const foreign = await query(
      'SELECT 1 FROM materials WHERE topic_id = ? AND (uploaded_by IS NULL OR uploaded_by <> ?) LIMIT 1',
      [topic.id, user.id]
    );
    if (foreign.length) throw new ApiError(403, "Mavzuda boshqa foydalanuvchi yuklagan materiallar bor, o'chira olmaysiz");
  }

  await execute('DELETE FROM topics WHERE id = ?', [topic.id]);
  ok(res, null, "Mavzu o'chirildi (materiallari bilan)");
});
