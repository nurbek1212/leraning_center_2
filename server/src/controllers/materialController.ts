import { Request } from 'express';
import { execute, query, transaction } from '../config/db';
import { ALLOWED_EXTENSIONS, ALLOWED_FILES, assertSubjectAccess, cleanFileName, extensionOf, matchesSignature, MAX_FILE_BYTES } from '../utils/materials';
import { ApiError, asyncHandler, ok } from '../utils/http';

// Fayl tanasi (raw) bilan yuklash: POST /api/topics/:id/materials?kind=&title=&filename=
export const upload = asyncHandler(async (req: Request, res) => {
  const user = req.user!;
  const topicId = Number(req.params.id);
  const { kind, title, filename } = req.query as unknown as { kind: string; title: string; filename: string };

  const topic = await query<{ id: number; subject_id: number }>('SELECT id, subject_id FROM topics WHERE id = ?', [topicId]);
  if (!topic.length) throw new ApiError(404, 'Mavzu topilmadi');
  await assertSubjectAccess(user, topic[0].subject_id, true);

  const data = req.body as unknown;
  if (!Buffer.isBuffer(data) || data.length === 0) throw new ApiError(400, 'Fayl yuborilmadi');
  if (data.length > MAX_FILE_BYTES) throw new ApiError(413, `Fayl hajmi ${MAX_FILE_BYTES / 1024 / 1024} MB dan oshmasligi kerak`);

  const fileName = cleanFileName(filename);
  const ext = extensionOf(fileName);
  const allowed = ALLOWED_FILES[ext];
  if (!allowed) throw new ApiError(400, `Fayl turi ruxsat etilmagan. Ruxsat etilgan: ${ALLOWED_EXTENSIONS.join(', ')}`);
  if (!matchesSignature(data, allowed.sig)) throw new ApiError(400, "Fayl mazmuni kengaytmasiga mos emas yoki buzilgan");

  const id = await transaction(async (conn) => {
    const r = await execute(
      `INSERT INTO materials (topic_id, kind, title, file_name, mime_type, size, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [topicId, kind, title, fileName, allowed.mime, data.length, user.id],
      conn
    );
    await execute('INSERT INTO material_files (material_id, data) VALUES (?, ?)', [r.insertId, data], conn);
    return r.insertId;
  });

  ok(res, { id, topic_id: topicId, kind, title, file_name: fileName, size: data.length }, 'Material yuklandi', 201);
});

async function findMaterial(id: number) {
  const rows = await query<{
    id: number;
    topic_id: number;
    subject_id: number;
    file_name: string;
    mime_type: string;
    size: number;
    uploaded_by: number | null;
  }>(
    `SELECT m.id, m.topic_id, t.subject_id, m.file_name, m.mime_type, m.size, m.uploaded_by
     FROM materials m JOIN topics t ON t.id = m.topic_id WHERE m.id = ?`,
    [id]
  );
  if (!rows.length) throw new ApiError(404, 'Material topilmadi');
  return rows[0];
}

export const download = asyncHandler(async (req, res) => {
  const material = await findMaterial(Number(req.params.id));
  await assertSubjectAccess(req.user!, material.subject_id, false);

  const [file] = await query<{ data: Buffer }>('SELECT data FROM material_files WHERE material_id = ?', [material.id]);
  if (!file) throw new ApiError(404, 'Fayl topilmadi');

  // Doim yuklab olinadigan fayl sifatida beriladi (brauzerda ochilib ketmaydi)
  const ascii = material.file_name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  res.setHeader('Content-Type', material.mime_type);
  res.setHeader('Content-Length', String(file.data.length));
  res.setHeader('Content-Disposition', `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(material.file_name)}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.end(file.data);
});

export const remove = asyncHandler(async (req, res) => {
  const user = req.user!;
  const material = await findMaterial(Number(req.params.id));
  await assertSubjectAccess(user, material.subject_id, true);
  // Ustoz faqat o'zi yuklagan materialni o'chiradi; admin hammasini
  if (user.role === 'teacher' && material.uploaded_by !== user.id) {
    throw new ApiError(403, "Faqat o'zingiz yuklagan materialni o'chira olasiz");
  }
  await execute('DELETE FROM materials WHERE id = ?', [material.id]);
  ok(res, null, "Material o'chirildi");
});
