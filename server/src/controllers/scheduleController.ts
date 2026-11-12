import { query } from '../config/db';
import { asyncHandler, ok } from '../utils/http';

// Foydalanuvchining dars jadvali: guruhlari va ularning "Du-Chor-Ju 14:00" ko'rinishidagi jadvali
export const mine = asyncHandler(async (req, res) => {
  const user = req.user!;
  const rows = await query(
    user.role === 'teacher'
      ? `SELECT g.id, g.name, g.schedule, s.name AS subject_name, u.full_name AS teacher_name
         FROM \`groups\` g JOIN subjects s ON s.id = g.subject_id JOIN users u ON u.id = g.teacher_id
         WHERE g.teacher_id = ? AND g.schedule IS NOT NULL`
      : `SELECT g.id, g.name, g.schedule, s.name AS subject_name, u.full_name AS teacher_name
         FROM group_students gs JOIN \`groups\` g ON g.id = gs.group_id
         JOIN subjects s ON s.id = g.subject_id JOIN users u ON u.id = g.teacher_id
         WHERE gs.student_id = ? AND g.schedule IS NOT NULL`,
    [user.id]
  );
  ok(res, rows);
});
