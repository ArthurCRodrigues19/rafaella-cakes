import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { AppError } from '../utils/AppError';
import { isProd } from '../config/env';

/**
 * Formato único de erro da API:
 * { error: { message, code, details? } }
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, code: err.code, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    return res.status(400).json({
      error: {
        message: 'Alguns dados estão inválidos. Confira os campos destacados.',
        code: 'VALIDATION_ERROR',
        details: fields,
      },
    });
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'A imagem deve ter no máximo 5 MB.' : 'Falha no envio do arquivo.';
    return res.status(400).json({ error: { message, code: 'UPLOAD_ERROR' } });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res
        .status(409)
        .json({ error: { message: 'Já existe um registro com esses dados.', code: 'CONFLICT' } });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { message: 'Registro não encontrado.', code: 'NOT_FOUND' } });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({
        error: { message: 'Este registro está em uso e não pode ser removido.', code: 'CONFLICT' },
      });
    }
  }

  // Banco fora do ar (ex.: Docker desligado)
  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error('[banco] Não foi possível conectar ao PostgreSQL. Ele está rodando? (npm run db:up)');
    return res.status(503).json({
      error: { message: 'Serviço temporariamente indisponível. Tente novamente em instantes.', code: 'DB_UNAVAILABLE' },
    });
  }

  // JSON malformado enviado pelo cliente
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: { message: 'JSON inválido.', code: 'BAD_JSON' } });
  }

  console.error('[erro não tratado]', err);
  return res.status(500).json({
    error: {
      message: 'Ops! Algo deu errado do nosso lado. Tente novamente em instantes.',
      code: 'INTERNAL_ERROR',
      ...(isProd ? {} : { details: String(err) }),
    },
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { message: 'Rota não encontrada.', code: 'NOT_FOUND' } });
}
