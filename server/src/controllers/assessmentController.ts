import { Request } from 'express';
import { execute, query, transaction } from '../config/db';
import { assertGroupAccess, isStudentInGroup } from '../utils/access';
import { assertScoreWithinMax, getPublishedComponentForGroup } from '../utils/grading';
import { ApiError, asyncHandler, ok } from '../utils/http';


interface AssessmentRow {
  id: number;
  group_id: number;
  teacher_id: number;
  title: string;
  description: string | null;
  stage: 'current' | 'midterm' | 'final';
  format: 'test' | 'written' | 'oral';
  component_id: number | null;
  max_score: number;
  held_at: string;
  duration_minutes: number | null;
  status: 'draft' | 'open' | 'closed';
}

const SELECT_ASSESSMENT = `
  SELECT a.id, a.group_id, a.teacher_id, a.title, a.description, a.stage, a.format, a.component_id,
         a.max_score, a.held_at, a.duration_minutes, a.status, a.created_at,
         g.name AS group_name, s.name AS subject_name, gc.name AS component_name,
         (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.id) AS question_count
  FROM assessments a
  JOIN \`groups\` g ON g.id = a.group_id
  JOIN subjects s ON s.id = g.subject_id
  LEFT JOIN grading_components gc ON gc.id = a.component_id`;

// Nazoratni topadi va ustoz/admin unga kira olishini tekshiradi
async function loadForStaff(req: Request, id: number): Promise<AssessmentRow> {
  const rows = await query<AssessmentRow>('SELECT * FROM assessments WHERE id = ?', [id]);
  if (!rows.length) throw new ApiError(404, 'Nazorat topilmadi');
  await assertGroupAccess(req.user!, rows[0].group_id);
  return rows[0];
}

async function resolveMax(groupId: number, componentId: number | null | undefined, maxScore: number | null | undefined) {
  if (componentId) {
    const c = await getPublishedComponentForGroup(componentId, groupId);
    return { componentId: c.id, maxScore: c.max_score };
  }
  return { componentId: null, maxScore: maxScore as number };
}

// ---------- Ustoz / admin ----------

export const components = asyncHandler(async (req, res) => {
  const groupId = Number(req.query.groupId);
  await assertGroupAccess(req.user!, groupId);
  const rows = await query(
    `SELECT c.id, c.name, c.max_score, c.is_exam
     FROM grading_components c
     JOIN grading_schemes sc ON sc.id = c.scheme_id
     JOIN \`groups\` g ON g.subject_id = sc.subject_id
     WHERE g.id = ? AND sc.status = 'published'
     ORDER BY c.id`,
    [groupId]
  );
  ok(res, rows);
});

export const list = asyncHandler(async (req, res) => {
  const user = req.user!;
  const groupId = req.query.groupId ? Number(req.query.groupId) : null;
  if (groupId) await assertGroupAccess(user, groupId);
  const where: string[] = [];
  const params: unknown[] = [];
  if (groupId) {
    where.push('a.group_id = ?');
    params.push(groupId);
  }
  if (user.role === 'teacher') {
    where.push('g.teacher_id = ?');
    params.push(user.id);
  }
  const rows = await query(
    `${SELECT_ASSESSMENT}
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY a.held_at DESC, a.id DESC`,
    params
  );
  const ids = rows.map((r: any) => r.id);
  const stats = ids.length
    ? await query<{ assessment_id: number; submitted: number; scored: number }>(
        `SELECT assessment_id, SUM(submitted_at IS NOT NULL) AS submitted, SUM(score IS NOT NULL) AS scored
         FROM assessment_results WHERE assessment_id IN (?) GROUP BY assessment_id`,
        [ids]
      )
    : [];
  const students = ids.length
    ? await query<{ assessment_id: number; total: number }>(
        `SELECT a.id AS assessment_id, COUNT(gs.student_id) AS total
         FROM assessments a JOIN group_students gs ON gs.group_id = a.group_id
         WHERE a.id IN (?) GROUP BY a.id`,
        [ids]
      )
    : [];
  ok(
    res,
    rows.map((r: any) => ({
      ...r,
      submitted_count: Number(stats.find((s) => s.assessment_id === r.id)?.submitted ?? 0),
      scored_count: Number(stats.find((s) => s.assessment_id === r.id)?.scored ?? 0),
      student_count: Number(students.find((s) => s.assessment_id === r.id)?.total ?? 0),
    }))
  );
});

async function questionsOf(assessmentId: number, withCorrect: boolean) {
  const qs = await query<{ id: number; position: number; text: string }>(
    'SELECT id, position, text FROM assessment_questions WHERE assessment_id = ? ORDER BY position, id',
    [assessmentId]
  );
  const opts = qs.length
    ? await query<{ id: number; question_id: number; text: string; is_correct: number }>(
        'SELECT id, question_id, text, is_correct FROM assessment_options WHERE question_id IN (?) ORDER BY position, id',
        [qs.map((q) => q.id)]
      )
    : [];
  return qs.map((q) => ({
    id: q.id,
    text: q.text,
    options: opts
      .filter((o) => o.question_id === q.id)
      .map((o) => (withCorrect ? { id: o.id, text: o.text, is_correct: !!o.is_correct } : { id: o.id, text: o.text })),
  }));
}

export const getOne = asyncHandler(async (req, res) => {
  const base = await loadForStaff(req, Number(req.params.id));
  const [row] = await query(`${SELECT_ASSESSMENT} WHERE a.id = ?`, [base.id]);
  const hasAttempts = (await query('SELECT 1 FROM assessment_results WHERE assessment_id = ? AND started_at IS NOT NULL LIMIT 1', [base.id])).length > 0;
  ok(res, { ...row, questions: base.format === 'test' ? await questionsOf(base.id, true) : [], has_attempts: hasAttempts });
});

export const create = asyncHandler(async (req, res) => {
  const b = req.body;
  const group = await assertGroupAccess(req.user!, b.groupId);
  const { componentId, maxScore } = await resolveMax(b.groupId, b.componentId, b.maxScore);
  const status = b.format === 'test' ? 'draft' : 'open';
  const r = await execute(
    `INSERT INTO assessments (group_id, teacher_id, title, description, stage, format, component_id, max_score, held_at, duration_minutes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [b.groupId, group.teacher_id, b.title, b.description || null, b.stage, b.format, componentId, maxScore, b.heldAt, b.format === 'test' ? b.durationMinutes : null, status]
  );
  ok(res, { id: r.insertId }, 'Nazorat yaratildi', 201);
});

export const update = asyncHandler(async (req, res) => {
  const cur = await loadForStaff(req, Number(req.params.id));
  const b = req.body;
  if (b.format !== cur.format) {
    const used = await query('SELECT 1 FROM assessment_results WHERE assessment_id = ? LIMIT 1', [cur.id]);
    if (used.length) throw new ApiError(409, "Natijalar kiritilgan nazoratning shaklini o'zgartirib bo'lmaydi");
  }
  const { componentId, maxScore } = await resolveMax(cur.group_id, b.componentId, b.maxScore);
  const over = await query('SELECT 1 FROM assessment_results WHERE assessment_id = ? AND score > ? LIMIT 1', [cur.id, maxScore]);
  if (over.length) throw new ApiError(409, `Ba'zi talabalarning bali ${maxScore} dan yuqori. Avval ularni tuzating`);
  await execute(
    `UPDATE assessments SET title = ?, description = ?, stage = ?, format = ?, component_id = ?, max_score = ?,
            held_at = ?, duration_minutes = ? WHERE id = ?`,
    [b.title, b.description || null, b.stage, b.format, componentId, maxScore, b.heldAt, b.format === 'test' ? b.durationMinutes : null, cur.id]
  );
  ok(res, null, 'Nazorat yangilandi');
});

export const setStatus = asyncHandler(async (req, res) => {
  const cur = await loadForStaff(req, Number(req.params.id));
  const status = req.body.status as AssessmentRow['status'];
  if (cur.format !== 'test' && status === 'draft') throw new ApiError(400, "Yozma va og'zaki nazorat qoralama bo'lmaydi");
  if (cur.format === 'test' && status === 'open') {
    const [{ n }] = await query<{ n: number }>('SELECT COUNT(*) AS n FROM assessment_questions WHERE assessment_id = ?', [cur.id]);
    if (!n) throw new ApiError(400, "Testni ochishdan oldin kamida bitta savol qo'shing");
  }
  await execute('UPDATE assessments SET status = ? WHERE id = ?', [status, cur.id]);
  ok(res, null, 'Holat yangilandi');
});

export const remove = asyncHandler(async (req, res) => {
  const cur = await loadForStaff(req, Number(req.params.id));
  await execute('DELETE FROM assessments WHERE id = ?', [cur.id]);
  ok(res, null, "Nazorat o'chirildi (baholarga o'tkazilgan ballar saqlanib qoladi)");
});

export const saveQuestions = asyncHandler(async (req, res) => {
  const cur = await loadForStaff(req, Number(req.params.id));
  if (cur.format !== 'test') throw new ApiError(400, "Savollar faqat test uchun");
  const started = await query('SELECT 1 FROM assessment_results WHERE assessment_id = ? AND started_at IS NOT NULL LIMIT 1', [cur.id]);
  if (started.length) throw new ApiError(409, "Talabalar testni boshlagan, savollarni o'zgartirib bo'lmaydi");
  const questions = req.body.questions as { text: string; options: { text: string; isCorrect: boolean }[] }[];
  questions.forEach((q, i) => {
    if (q.options.filter((o) => o.isCorrect).length !== 1) {
      throw new ApiError(400, `${i + 1}-savolda aynan bitta to'g'ri javob belgilanishi kerak`);
    }
  });
  if (cur.status === 'open' && !questions.length) throw new ApiError(400, "Ochiq testda savol bo'lishi shart");
  await transaction(async (conn) => {
    await execute('DELETE FROM assessment_questions WHERE assessment_id = ?', [cur.id], conn);
    for (let i = 0; i < questions.length; i++) {
      const q = await execute('INSERT INTO assessment_questions (assessment_id, position, text) VALUES (?, ?, ?)', [cur.id, i + 1, questions[i].text], conn);
      for (let j = 0; j < questions[i].options.length; j++) {
        const o = questions[i].options[j];
        await execute('INSERT INTO assessment_options (question_id, position, text, is_correct) VALUES (?, ?, ?, ?)', [q.insertId, j + 1, o.text, o.isCorrect ? 1 : 0], conn);
      }
    }
  });
  ok(res, null, 'Savollar saqlandi');
});

export const results = asyncHandler(async (req, res) => {
  const cur = await loadForStaff(req, Number(req.params.id));
  const rows = await query(
    `SELECT u.id AS student_id, u.full_name, r.started_at, r.submitted_at, r.correct_count, r.total_questions,
            r.score, r.comment, r.scored_at,
            (SELECT COUNT(*) FROM grades gr WHERE gr.assessment_id = ? AND gr.student_id = u.id) AS posted
     FROM group_students gs
     JOIN users u ON u.id = gs.student_id
     LEFT JOIN assessment_results r ON r.assessment_id = ? AND r.student_id = u.id
     WHERE gs.group_id = ?
     ORDER BY u.full_name`,
    [cur.id, cur.id, cur.group_id]
  );
  ok(res, rows.map((r: any) => ({ ...r, posted: Number(r.posted) > 0 })));
});

export const setScore = asyncHandler(async (req, res) => {
  const cur = await loadForStaff(req, Number(req.params.id));
  const studentId = Number(req.params.studentId);
  if (cur.status === 'draft') throw new ApiError(409, "Nazorat hali ochilmagan");
  if (!(await isStudentInGroup(cur.group_id, studentId))) throw new ApiError(404, 'Talaba bu guruhda emas');
  const { score, comment } = req.body as { score: number; comment?: string | null };
  if (score > cur.max_score) throw new ApiError(400, `Ball ${cur.max_score} dan oshmasligi kerak`);
  await execute(
    `INSERT INTO assessment_results (assessment_id, student_id, score, comment, scored_by, scored_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE score = VALUES(score), comment = VALUES(comment), scored_by = VALUES(scored_by), scored_at = NOW()`,
    [cur.id, studentId, score, comment || null, req.user!.id]
  );
  ok(res, null, 'Ball saqlandi');
});

export const clearScore = asyncHandler(async (req, res) => {
  const cur = await loadForStaff(req, Number(req.params.id));
  await execute(
    'UPDATE assessment_results SET score = NULL, comment = NULL, scored_by = NULL, scored_at = NULL WHERE assessment_id = ? AND student_id = ?',
    [cur.id, Number(req.params.studentId)]
  );
  ok(res, null, 'Ball olib tashlandi');
});

// Talabaning urinishini bekor qiladi: u testni qaytadan topshira oladi
export const resetAttempt = asyncHandler(async (req, res) => {
  const cur = await loadForStaff(req, Number(req.params.id));
  if (cur.format !== 'test') throw new ApiError(400, 'Faqat test uchun');
  await execute('DELETE FROM assessment_results WHERE assessment_id = ? AND student_id = ?', [cur.id, Number(req.params.studentId)]);
  ok(res, null, 'Urinish bekor qilindi');
});

// Avto-hisoblangan natijani ball sifatida qabul qiladi (hali ball qo'yilmaganlar uchun)
export const acceptSuggested = asyncHandler(async (req, res) => {
  const cur = await loadForStaff(req, Number(req.params.id));
  if (cur.format !== 'test') throw new ApiError(400, 'Faqat test uchun');
  const r = await execute(
    `UPDATE assessment_results
     SET score = ROUND(correct_count * ? / total_questions), scored_by = ?, scored_at = NOW()
     WHERE assessment_id = ? AND submitted_at IS NOT NULL AND score IS NULL AND total_questions > 0`,
    [cur.max_score, req.user!.id, cur.id]
  );
  ok(res, { updated: r.affectedRows }, `${r.affectedRows} ta natija qabul qilindi`);
});

// Ballarni baholash jadvaliga (mezon komponentiga) o'tkazadi
export const postGrades = asyncHandler(async (req, res) => {
  const cur = await loadForStaff(req, Number(req.params.id));
  if (!cur.component_id) throw new ApiError(400, "Baholarga o'tkazish uchun nazoratni mezon qismiga bog'lang");
  const comp = await getPublishedComponentForGroup(cur.component_id, cur.group_id);
  const scored = await query<{ student_id: number; score: number; comment: string | null }>(
    `SELECT r.student_id, r.score, r.comment FROM assessment_results r
     JOIN group_students gs ON gs.group_id = ? AND gs.student_id = r.student_id
     WHERE r.assessment_id = ? AND r.score IS NOT NULL`,
    [cur.group_id, cur.id]
  );
  if (!scored.length) throw new ApiError(400, "Ball qo'yilgan talaba yo'q");
  scored.forEach((s) => assertScoreWithinMax(s.score, comp));
  await transaction(async (conn) => {
    for (const s of scored) {
      await execute(
        `INSERT INTO grades (student_id, group_id, teacher_id, component_id, score, comment, date, assessment_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE score = VALUES(score), comment = VALUES(comment), date = VALUES(date),
                                 component_id = VALUES(component_id), teacher_id = VALUES(teacher_id)`,
        [s.student_id, cur.group_id, req.user!.id, comp.id, s.score, s.comment || cur.title.slice(0, 255), cur.held_at, cur.id],
        conn
      );
    }
  });
  ok(res, { posted: scored.length }, `${scored.length} ta ball baholarga o'tkazildi`);
});
