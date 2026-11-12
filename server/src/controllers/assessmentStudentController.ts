import { execute, query, transaction } from '../config/db';
import { ApiError, asyncHandler, ok } from '../utils/http';

const GRACE_SECONDS = 30;

interface StudentAssessment {
  id: number;
  group_id: number;
  title: string;
  description: string | null;
  stage: string;
  format: 'test' | 'written' | 'oral';
  max_score: number;
  held_at: string;
  duration_minutes: number | null;
  status: 'draft' | 'open' | 'closed';
  group_name: string;
  subject_name: string;
  component_name: string | null;
  question_count: number;
  started_at: string | null;
  submitted_at: string | null;
  correct_count: number | null;
  total_questions: number | null;
  score: number | null;
  comment: string | null;
  seconds_left: number | null;
}

// Talaba o'z guruhlaridagi (qoralama bo'lmagan) nazoratlarini ko'radi
const SELECT_MY = `
  SELECT a.id, a.group_id, a.title, a.description, a.stage, a.format, a.max_score, a.held_at,
         a.duration_minutes, a.status, g.name AS group_name, s.name AS subject_name, gc.name AS component_name,
         (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.id) AS question_count,
         r.started_at, r.submitted_at, r.correct_count, r.total_questions, r.score, r.comment,
         CASE WHEN r.started_at IS NOT NULL AND r.submitted_at IS NULL AND a.duration_minutes IS NOT NULL
              THEN a.duration_minutes * 60 - TIMESTAMPDIFF(SECOND, r.started_at, NOW()) END AS seconds_left
  FROM assessments a
  JOIN group_students gs ON gs.group_id = a.group_id AND gs.student_id = ?
  JOIN \`groups\` g ON g.id = a.group_id
  JOIN subjects s ON s.id = g.subject_id
  LEFT JOIN grading_components gc ON gc.id = a.component_id
  LEFT JOIN assessment_results r ON r.assessment_id = a.id AND r.student_id = ?
  WHERE a.status <> 'draft'`;

async function mine(studentId: number, id: number): Promise<StudentAssessment> {
  const rows = await query<StudentAssessment>(`${SELECT_MY} AND a.id = ?`, [studentId, studentId, id]);
  if (!rows.length) throw new ApiError(404, 'Nazorat topilmadi');
  return rows[0];
}

// Vaqti o'tib ketgan, lekin topshirilmagan urinishni nol natija bilan yopadi
async function closeExpired(studentId: number, a: StudentAssessment): Promise<StudentAssessment> {
  if (a.started_at && !a.submitted_at && a.seconds_left !== null && a.seconds_left < -GRACE_SECONDS) {
    await execute(
      `UPDATE assessment_results SET submitted_at = NOW(), correct_count = 0, total_questions = ?
       WHERE assessment_id = ? AND student_id = ? AND submitted_at IS NULL`,
      [a.question_count, a.id, studentId]
    );
    return mine(studentId, a.id);
  }
  return a;
}

// Talabaga javoblar to'g'riligi faqat nazorat yopilgandan keyin ko'rsatiladi
function present(a: StudentAssessment) {
  const showScore = a.score !== null;
  return {
    ...a,
    score: showScore ? a.score : null,
    comment: showScore ? a.comment : null,
    seconds_left: a.submitted_at ? null : a.seconds_left !== null ? Math.max(0, a.seconds_left) : null,
  };
}

export const list = asyncHandler(async (req, res) => {
  const uid = req.user!.id;
  const rows = await query<StudentAssessment>(`${SELECT_MY} ORDER BY a.held_at DESC, a.id DESC`, [uid, uid]);
  const fixed: StudentAssessment[] = [];
  for (const r of rows) fixed.push(await closeExpired(uid, r));
  ok(res, fixed.map(present));
});

export const getOne = asyncHandler(async (req, res) => {
  const uid = req.user!.id;
  const a = await closeExpired(uid, await mine(uid, Number(req.params.id)));
  let review: unknown = null;
  if (a.format === 'test' && a.submitted_at && a.status === 'closed') {
    review = await query(
      `SELECT q.id AS question_id, q.text,
              (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', o.id, 'text', o.text, 'is_correct', o.is_correct = 1))
               FROM assessment_options o WHERE o.question_id = q.id) AS options,
              ans.option_id AS chosen_option_id
       FROM assessment_questions q
       LEFT JOIN assessment_results r ON r.assessment_id = q.assessment_id AND r.student_id = ?
       LEFT JOIN assessment_answers ans ON ans.result_id = r.id AND ans.question_id = q.id
       WHERE q.assessment_id = ? ORDER BY q.position, q.id`,
      [uid, a.id]
    );
  }
  ok(res, { ...present(a), review });
});

async function questionsForTaking(assessmentId: number) {
  const qs = await query<{ id: number; text: string }>(
    'SELECT id, text FROM assessment_questions WHERE assessment_id = ? ORDER BY position, id',
    [assessmentId]
  );
  const opts = qs.length
    ? await query<{ id: number; question_id: number; text: string }>(
        'SELECT id, question_id, text FROM assessment_options WHERE question_id IN (?) ORDER BY position, id',
        [qs.map((q) => q.id)]
      )
    : [];
  return qs.map((q) => ({ id: q.id, text: q.text, options: opts.filter((o) => o.question_id === q.id).map((o) => ({ id: o.id, text: o.text })) }));
}

// Testni boshlaydi (yoki davom ettiradi). Savollarda to'g'ri javob yuborilmaydi.
export const start = asyncHandler(async (req, res) => {
  const uid = req.user!.id;
  let a = await closeExpired(uid, await mine(uid, Number(req.params.id)));
  if (a.format !== 'test') throw new ApiError(400, 'Bu nazorat onlayn test emas');
  if (a.submitted_at) throw new ApiError(409, 'Siz bu testni allaqachon topshirgansiz');
  if (a.status !== 'open') throw new ApiError(409, 'Test hozir ochiq emas');
  if (!a.question_count) throw new ApiError(409, "Testda savollar yo'q");
  if (!a.started_at) {
    await execute('INSERT IGNORE INTO assessment_results (assessment_id, student_id, started_at) VALUES (?, ?, NOW())', [a.id, uid]);
    a = await mine(uid, a.id);
  }
  ok(res, { seconds_left: Math.max(0, a.seconds_left ?? 0), questions: await questionsForTaking(a.id) });
});

export const submit = asyncHandler(async (req, res) => {
  const uid = req.user!.id;
  const a = await mine(uid, Number(req.params.id));
  if (a.format !== 'test') throw new ApiError(400, 'Bu nazorat onlayn test emas');
  if (!a.started_at) throw new ApiError(409, 'Test boshlanmagan');
  if (a.submitted_at) throw new ApiError(409, 'Siz bu testni allaqachon topshirgansiz');
  const expired = a.seconds_left !== null && a.seconds_left < -GRACE_SECONDS;
  const answers = req.body.answers as { questionId: number; optionId: number | null }[];

  const correct = await query<{ question_id: number; id: number }>(
    `SELECT o.question_id, o.id FROM assessment_options o
     JOIN assessment_questions q ON q.id = o.question_id
     WHERE q.assessment_id = ? AND o.is_correct = 1`,
    [a.id]
  );
  const validOptions = await query<{ question_id: number; id: number }>(
    `SELECT o.question_id, o.id FROM assessment_options o JOIN assessment_questions q ON q.id = o.question_id WHERE q.assessment_id = ?`,
    [a.id]
  );
  const total = a.question_count;
  const chosen = new Map<number, number>();
  if (!expired) {
    for (const ans of answers) {
      if (ans.optionId && validOptions.some((o) => o.id === ans.optionId && o.question_id === ans.questionId)) {
        chosen.set(ans.questionId, ans.optionId);
      }
    }
  }
  let right = 0;
  chosen.forEach((optionId, questionId) => {
    if (correct.some((c) => c.question_id === questionId && c.id === optionId)) right++;
  });

  await transaction(async (conn) => {
    const res1 = await execute(
      `UPDATE assessment_results SET submitted_at = NOW(), correct_count = ?, total_questions = ?
       WHERE assessment_id = ? AND student_id = ? AND submitted_at IS NULL`,
      [right, total, a.id, uid],
      conn
    );
    if (!res1.affectedRows) throw new ApiError(409, 'Siz bu testni allaqachon topshirgansiz');
    const [r] = await query<{ id: number }>('SELECT id FROM assessment_results WHERE assessment_id = ? AND student_id = ?', [a.id, uid], conn);
    for (const [questionId, optionId] of chosen) {
      await execute('INSERT INTO assessment_answers (result_id, question_id, option_id) VALUES (?, ?, ?)', [r.id, questionId, optionId], conn);
    }
  });
  ok(res, { expired, total }, expired ? "Vaqt tugagan edi, natija hisoblanmadi" : 'Test topshirildi');
});
