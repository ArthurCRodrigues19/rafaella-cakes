import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { AppError } from '../utils/AppError';

/**
 * Armazenamento de arquivos em disco local (pasta apps/api/uploads).
 * Para produção, basta trocar este módulo por um que envie para S3/Cloudinary —
 * o resto do código só usa `imageUpload` e `publicUrl`.
 */
export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  // Nome aleatório: nunca usamos o nome enviado pelo usuário (evita path traversal)
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED[file.mimetype] ?? ''}`),
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED[file.mimetype]) cb(null, true);
    else cb(AppError.badRequest('Envie uma imagem JPG, PNG ou WEBP.'));
  },
});

export const publicUrl = (filename: string) => `/uploads/${filename}`;
