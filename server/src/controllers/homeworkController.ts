import { Request } from 'express';
import { execute, query } from '../config/db';
import { assertGroupAccess, isStudentInGroup } from '../utils/access';
import { ApiError, asyncHandler, ok } from '../utils/http';

interface HomeworkRow {
  id: number;
  group_id: number;
  teacher_id: number;
  title: string;
  description: string | null;
  due_date: string;
}

const SELECT_HW = `
  SELECT h.id, h.group_id, h.title, h.description, h.due_date, h.created_at,
         g.name AS group_name, s.name AS subject_name
  FROM homework h
  JOIN \`groups\` g ON g.id = h.group_id
  JOIN subjects s ON s.id = g.subject_id`;

async function loadForStaff(req: Request, id: number): Promise<HomeworkRow> {
  const rows = await query<HomeworkRow>('SELECT * FROM homework WHERE id = ?', [id]);
  if (!rows.length) throw new ApiError(404, 'Uy vazifasi topilmadi');
  await assertGroupAccess(req.user!, rows[0].group_id);
  return rows[0];
}

// ---------- Ustoz / admin ----------

export const list = asyncHandler(async (req, res) => {
  const user = req.user!;
  const groupId = req.query.groupId ? Number(req.query.groupId) : null;
  if (groupId) await assertGroupAccess(user, groupId);
  const where: string[] = [];
  const params: unknown[] = [];
  if (groupId) {
    where.push('h.group_id = ?');
    params.push(groupId);
  }
  if (user.role === 'teacher') {
    where.push('g.teacher_id = ?');
    params.push(user.id);
  }
  const rows = await query(
    `${SELECT_HW} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY h.due_date DESC, h.id DESC`,
    params
  );
  const ids = rows.map((r: any) => r.id);
  const subs = ids.length
    ? await query<{ homework_id: number; submitted: number; reviewed: number }>(
        `SELECT homework_id, COUNT(*) AS submitted, SUM(reviewed_at IS NOT NULL) AS reviewed
         FROM homework_submissions WHERE homework_id IN (?) GROUP BY homework_id`,
        [ids]
      )
    : [];
  const students = ids.length
    ? await query<{ homework_id: number; total: number }>(
        `SELECT h.id AS homework_id, COUNT(gs.student_id) AS total
         FROM homework h JOIN group_students gs ON gs.group_id = h.group_id
         WHERE h.id IN (?) GROUP BY h.id`,
        [ids]
      )
    : [];
  ok(
    res,
    rows.map((r: any) => ({
      ...r,
      submitted_count: Number(subs.find((s) => s.homework_id === r.id)?.submitted ?? 0),
      reviewed_count: Number(subs.find((s) => s.homework_id === r.id)?.reviewed ?? 0),
      student_count: Number(students.find((s) => s.homework_id === r.id)?.total ?? 0),
    }))
  );
});

export const create = asyncHandler(async (req, res) => {
  const b = req.body;
  const group = await assertGroupAccess(req.user!, b.groupId);
  const r = await execute('INSERT INTO homework (group_id, teacher_id, title, description, due_date) VALUES (?, ?, ?, ?, ?)', [
    b.groupId,
    group.teacher_id,
    b.title,
    b.description || null,
    b.dueDate,
  ]);
  ok(res, { id: r.insertId }, "Uy vazifasi qo'shildi", 201);
});

export const getOne = asyncHandler(async (req, res) => {
  const hw = await loadForStaff(req, Number(req.params.id));
  const [row] = await query(`${SELECT_HW} WHERE h.id = ?`, [hw.id]);
  const submissions = await query(
    `SELECT u.id AS student_id, u.full_name, s.content, s.submitted_at, s.updated_at,
            s.feedback, s.score, s.reviewed_at,
            (s.id IS NOT NULL AND s.submitted_at > CONCAT(?, ' 23:59:59')) AS late
     FROM group_students gs
     JOIN users u ON u.id = gs.student_id
     LEFT JOIN homework_submissions s ON s.homework_id = ? AND s.student_id = u.id
     WHERE gs.group_id = ?
     ORDER BY u.full_name`,
    [hw.due_date, hw.id, hw.group_id]
  );
  ok(res, { ...row, submissions: submissions.map((s: any) => ({ ...s, late: !!s.late })) });
});

export const update = asyncHandler(async (req, res) => {
  const hw = await loadForStaff(req, Number(req.params.id));
  const b = req.body;
  await execute('UPDATE homework SET title = ?, description = ?, due_date = ? WHERE id = ?', [b.title, b.description || null, b.dueDate, hw.id]);
  ok(res, null, 'Uy vazifasi yangilandi');
});

export const remove = asyncHandler(async (req, res) => {
  const hw = await loadForStaff(req, Number(req.params.id));
  await execute('DELETE FROM homework WHERE id = ?', [hw.id]);
  ok(res, null, "Uy vazifasi o'chirildi");
});

// Ustoz topshirilgan javobga izoh va (ixtiyoriy) ball qo'yadi
export const review = asyncHandler(async (req, res) => {
  const hw = await loadForStaff(req, Number(req.params.id));
  const studentId = Number(req.params.studentId);
  const { feedback, score } = req.body as { feedback?: string | null; score?: number | null };
  const r = await execute(
    `UPDATE homework_submissions SET feedback = ?, score = ?, reviewed_at = NOW() WHERE homework_id = ? AND student_id = ?`,
    [feedback || null, score ?? null, hw.id, studentId]
  );
  if (!r.affectedRows) throw new ApiError(404, "Talaba hali javob topshirmagan");
  ok(res, null, 'Tekshirildi');
});

// ---------- Talaba ----------

const SELECT_MY = `
  SELECT h.id, h.group_id, h.title, h.description, h.due_date, h.created_at,
         g.name AS group_name, s.name AS subject_name,
         sub.content, sub.submitted_at, sub.updated_at, sub.feedback, sub.score, sub.reviewed_at
  FROM homework h
  JOIN group_students gs ON gs.group_id = h.group_id AND gs.student_id = ?
  JOIN \`groups\` g ON g.id = h.group_id
  JOIN subjects s ON s.id = g.subject_id
  LEFT JOIN homework_submissions sub ON sub.homework_id = h.id AND sub.student_id = ?`;

export const myList = asyncHandler(async (req, res) => {
  const uid = req.user!.id;
  ok(res, await query(`${SELECT_MY} ORDER BY h.due_date DESC, h.id DESC`, [uid, uid]));
});

export const myOne = asyncHandler(async (req, res) => {
  const uid = req.user!.id;
  const rows = await query(`${SELECT_MY} WHERE h.id = ?`, [uid, uid, Number(req.params.id)]);
  if (!rows.length) throw new ApiError(404, 'Uy vazifasi topilmadi');
  ok(res, rows[0]);
});

// Javob muddatdan keyin ham topshirilishi mumkin (kech deb belgilanadi); ustoz tekshirgach o'zgartirib bo'lmaydi
export const submit = asyncHandler(async (req, res) => {
  const uid = req.user!.id;
  const id = Number(req.params.id);
  const [hw] = await query<HomeworkRow>('SELECT * FROM homework WHERE id = ?', [id]);
  if (!hw || !(await isStudentInGroup(hw.group_id, uid))) throw new ApiError(404, 'Uy vazifasi topilmadi');
  const [existing] = await query<{ reviewed_at: string | null }>('SELECT reviewed_at FROM homework_submissions WHERE homework_id = ? AND student_id = ?', [id, uid]);
  if (existing?.reviewed_at) throw new ApiError(409, "Ustoz tekshirib bo'lgan, javobni o'zgartirib bo'lmaydi");
  await execute(
    `INSERT INTO homework_submissions (homework_id, student_id, content) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE content = VALUES(content)`,
    [id, uid, req.body.content]
  );
  ok(res, null, 'Javob topshirildi');
});
