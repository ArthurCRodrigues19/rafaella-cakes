import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { SESSION_COOKIE, verifySession } from '../lib/session';
import { AppError } from '../utils/AppError';

async function resolveUser(req: Request) {
  const header = req.headers.authorization;
  const token =
    (req.cookies?.[SESSION_COOKIE] as string | undefined) ??
    (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
  if (!token) return;

  const payload = verifySession(token);
  if (!payload) return;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true, tokenVersion: true },
  });
  // tokenVersion diferente = sessão revogada (logout geral ou troca de senha)
  if (!user || user.tokenVersion !== payload.tv) return;

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
}

/** Carrega o usuário se houver sessão, mas não exige login. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  resolveUser(req).then(() => next(), next);
}

/** Exige usuário logado. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  resolveUser(req)
    .then(() => (req.user ? next() : next(AppError.unauthorized())))
    .catch(next);
}

/** Exige usuário logado com papel ADMIN. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  resolveUser(req)
    .then(() => {
      if (!req.user) return next(AppError.unauthorized());
      if (req.user.role !== 'ADMIN') return next(AppError.forbidden());
      next();
    })
    .catch(next);
}
