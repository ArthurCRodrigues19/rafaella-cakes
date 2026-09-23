import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env, isProd } from '../config/env';

export const SESSION_COOKIE = 'rc_session';

interface SessionPayload {
  sub: string;
  role: Role;
  tv: number; // tokenVersion
}

export function signSession(user: { id: string; role: Role; tokenVersion: number }): string {
  const payload: SessionPayload = { sub: user.id, role: user.role, tv: user.tokenVersion };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.SESSION_DAYS * 24 * 60 * 60 });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * O token fica em cookie httpOnly: o JavaScript do navegador não consegue lê-lo,
 * o que protege a sessão contra roubo via XSS. SameSite=Lax bloqueia CSRF em POSTs
 * vindos de outros sites.
 */
export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: env.SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' });
}
