import { query } from '../config/db';
import type { AuthUser } from '../types/express';
import { ApiError } from './http';

// Bitta fayl hajmi chegarasi. MySQL'ning max_allowed_packet qiymatidan kichik bo'lishi kerak.
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

type Signature = 'pdf' | 'zip' | 'ole';

// Ruxsat etilgan fayl turlari. MIME turi mijozdan olinmaydi, kengaytma bo'yicha o'zimiz belgilaymiz
// (aks holda HTML kabi xavfli fayl yuklab, boshqalarga ochtirish mumkin bo'lardi).
export const ALLOWED_FILES: Record<string, { mime: string; sig: Signature }> = {
  pdf: { mime: 'application/pdf', sig: 'pdf' },
  ppt: { mime: 'application/vnd.ms-powerpoint', sig: 'ole' },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', sig: 'zip' },
  doc: { mime: 'application/msword', sig: 'ole' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sig: 'zip' },
  odp: { mime: 'application/vnd.oasis.opendocument.presentation', sig: 'zip' },
  odt: { mime: 'application/vnd.oasis.opendocument.text', sig: 'zip' },
};

export const ALLOWED_EXTENSIONS = Object.keys(ALLOWED_FILES);

// Fayl nomi: papka yo'li, boshqaruv belgilari olib tashlanadi, uzunligi cheklanadi
export function cleanFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|:*?]/g, '').trim();
  if (cleaned.length <= 200) return cleaned;
  const dot = cleaned.lastIndexOf('.');
  const ext = dot > 0 ? cleaned.slice(dot) : '';
  return cleaned.slice(0, 200 - ext.length) + ext;
}

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

// Fayl mazmuni e'lon qilingan turga mos ekanini birinchi baytlar bo'yicha tekshiradi
export function matchesSignature(data: Buffer, sig: Signature): boolean {
  if (data.length < 8) return false;
  if (sig === 'pdf') return data.subarray(0, 5).toString('latin1') === '%PDF-';
  if (sig === 'zip') return data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04;
  return data[0] === 0xd0 && data[1] === 0xcf && data[2] === 0x11 && data[3] === 0xe0;
}

// Foydalanuvchi shu fanning materiallarini ko'ra / boshqara oladimi?
// admin: hammasi; ustoz: o'z guruhi yoki biriktirilgan fani; talaba: faqat o'z guruhi fani (ko'rish).
export async function assertSubjectAccess(user: AuthUser, subjectId: number, write: boolean): Promise<void> {
  const subject = await query('SELECT 1 FROM subjects WHERE id = ?', [subjectId]);
  if (!subject.length) throw new ApiError(404, 'Fan topilmadi');
  if (user.role === 'admin') return;

  if (user.role === 'teacher') {
    const rows = await query(
      `SELECT 1 FROM \`groups\` WHERE subject_id = ? AND teacher_id = ?
       UNION SELECT 1 FROM teacher_subjects WHERE subject_id = ? AND teacher_id = ?
       LIMIT 1`,
      [subjectId, user.id, subjectId, user.id]
    );
    if (!rows.length) throw new ApiError(403, "Bu fan sizga biriktirilmagan");
    return;
  }

  if (write) throw new ApiError(403, "Materiallarni faqat ustoz yoki administrator yuklay oladi");
  const rows = await query(
    `SELECT 1 FROM group_students gs JOIN \`groups\` g ON g.id = gs.group_id
     WHERE gs.student_id = ? AND g.subject_id = ? LIMIT 1`,
    [user.id, subjectId]
  );
  if (!rows.length) throw new ApiError(403, "Bu fan sizning guruhlaringizda yo'q");
}
