import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { env } from '../config/env';
import type { AuthUser } from '../types/express';
import { ApiError, asyncHandler } from '../utils/http';

// Authorization: Bearer <token> ni tekshiradi va req.user ni to'ldiradi
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Avtorizatsiya talab qilinadi');
  }

  let payload: { id: number; iat?: number };
  try {
    payload = jwt.verify(header.slice(7), env.jwtSecret) as unknown as { id: number; iat?: number };
  } catch {
    throw new ApiError(401, 'Token yaroqsiz yoki muddati tugagan');
  }

  // Foydalanuvchi o'chirilgan bo'lsa, eski token ishlamasligi uchun bazadan tekshiramiz
  const rows = await query<AuthUser & { pwd_changed: number | null }>(
    'SELECT id, full_name, email, role, phone, UNIX_TIMESTAMP(password_changed_at) AS pwd_changed FROM users WHERE id = ?',
    [payload.id]
  );
  if (!rows.length) throw new ApiError(401, 'Foydalanuvchi topilmadi');

  // Parol o'zgartirilgandan oldin berilgan tokenlar endi yaroqsiz
  const { pwd_changed, ...user } = rows[0];
  if (pwd_changed && (payload.iat ?? 0) < Math.floor(Number(pwd_changed))) {
    throw new ApiError(401, "Parol o'zgartirilgan, qayta kiring");
  }

  req.user = user;
  next();
});
