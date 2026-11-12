import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { env } from '../config/env';
import { AttemptLimiter } from '../utils/attemptLimiter';
import { ApiError, asyncHandler, ok } from '../utils/http';

// 15 daqiqada 8 ta xato urinishdan keyin shu IP+email juftligi to'xtatiladi; IP bo'yicha umumiy chegara ham bor
const WINDOW = 15 * 60 * 1000;
const loginByAccount = new AttemptLimiter(8, WINDOW);
const loginByIp = new AttemptLimiter(40, WINDOW);
const passwordByUser = new AttemptLimiter(8, WINDOW);

function signToken(user: { id: number; role: string }) {
  return jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

function assertNotBlocked(seconds: number) {
  if (seconds > 0) {
    const minutes = Math.ceil(seconds / 60);
    throw new ApiError(429, `Juda ko'p urinish. ${minutes} daqiqadan keyin qayta urinib ko'ring`);
  }
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const ip = req.ip || 'unknown';
  const accountKey = `${ip}|${email}`;
  assertNotBlocked(Math.max(loginByAccount.retryAfterSeconds(accountKey), loginByIp.retryAfterSeconds(ip)));

  const rows = await query<any>(
    'SELECT id, full_name, email, password, role, phone FROM users WHERE email = ?',
    [email]
  );
  const user = rows[0];
  // Email yoki parol xato bo'lsa bir xil xabar qaytariladi
  if (!user || !(await bcrypt.compare(password, user.password))) {
    loginByAccount.fail(accountKey);
    loginByIp.fail(ip);
    throw new ApiError(401, "Email yoki parol noto'g'ri");
  }

  loginByAccount.reset(accountKey);
  const token = signToken(user);

  delete user.password;
  ok(res, { token, user }, 'Tizimga muvaffaqiyatli kirdingiz');
});

// Joriy foydalanuvchi + rolga qarab guruhlari / fanlari
export const me = asyncHandler(async (req, res) => {
  const user = req.user!;
  const [full] = await query<any>(
    'SELECT id, full_name, email, role, phone, created_at FROM users WHERE id = ?',
    [user.id]
  );

  let groups: unknown[] = [];
  let subjects: unknown[] = [];

  if (user.role === 'student') {
    groups = await query(
      `SELECT g.id, g.name, g.schedule, s.name AS subject_name, t.full_name AS teacher_name
       FROM group_students gs
       JOIN \`groups\` g ON g.id = gs.group_id
       JOIN subjects s ON s.id = g.subject_id
       JOIN users t ON t.id = g.teacher_id
       WHERE gs.student_id = ?
       ORDER BY g.name`,
      [user.id]
    );
  } else if (user.role === 'teacher') {
    groups = await query(
      `SELECT g.id, g.name, g.schedule, s.name AS subject_name
       FROM \`groups\` g JOIN subjects s ON s.id = g.subject_id
       WHERE g.teacher_id = ?
       ORDER BY g.name`,
      [user.id]
    );
    subjects = await query(
      `SELECT s.id, s.name FROM teacher_subjects ts
       JOIN subjects s ON s.id = ts.subject_id
       WHERE ts.teacher_id = ? ORDER BY s.name`,
      [user.id]
    );
  }

  ok(res, { ...full, groups, subjects });
});

// O'z parolini o'zgartirish. Eski tokenlar yaroqsiz bo'ladi, shuning uchun yangi token qaytariladi.
export const changePassword = asyncHandler(async (req, res) => {
  const user = req.user!;
  const key = String(user.id);
  assertNotBlocked(passwordByUser.retryAfterSeconds(key));

  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

  const [row] = await query<{ password: string }>('SELECT password FROM users WHERE id = ?', [user.id]);
  if (!row || !(await bcrypt.compare(currentPassword, row.password))) {
    passwordByUser.fail(key);
    throw new ApiError(400, "Joriy parol noto'g'ri");
  }
  if (currentPassword === newPassword) throw new ApiError(400, "Yangi parol joriy paroldan farq qilishi kerak");

  passwordByUser.reset(key);
  const hash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password = ?, password_changed_at = NOW() WHERE id = ?', [hash, user.id]);

  // Yangi token o'zgarish vaqtidan keyin beriladi, shuning uchun bu qurilmadagi sessiya davom etadi
  ok(res, { token: signToken(user) }, "Parol o'zgartirildi. Boshqa qurilmalardagi sessiyalar yopildi");
});
