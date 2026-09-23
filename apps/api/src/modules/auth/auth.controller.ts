import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { env, googleEnabled, isProd } from '../../config/env';
import { clearSessionCookie, setSessionCookie, signSession } from '../../lib/session';
import { AppError } from '../../utils/AppError';
import { usersRepository } from '../users/users.repository';
import { authService, toPublicUser } from './auth.service';
import { passwordSchema } from './auth.schemas';

const OAUTH_STATE_COOKIE = 'rc_oauth_state';
const GOOGLE_REDIRECT_URI = () => `${env.WEB_URL}/api/auth/google/callback`;

function startSession(res: Response, user: Parameters<typeof signSession>[0]) {
  setSessionCookie(res, signSession(user));
}

export const authController = {
  async register(req: Request, res: Response) {
    const user = await authService.register(req.body);
    startSession(res, user);
    res.status(201).json({ user: toPublicUser(user) });
  },

  async login(req: Request, res: Response) {
    const user = await authService.login(req.body);
    startSession(res, user);
    res.json({ user: toPublicUser(user) });
  },

  async adminLogin(req: Request, res: Response) {
    const user = await authService.login(req.body, { adminOnly: true });
    startSession(res, user);
    res.json({ user: toPublicUser(user) });
  },

  async logout(_req: Request, res: Response) {
    clearSessionCookie(res);
    res.status(204).end();
  },

  async me(req: Request, res: Response) {
    if (!req.user) return res.json({ user: null });
    const user = await usersRepository.findPublicById(req.user.id);
    res.json({ user: user ? toPublicUser(user) : null });
  },

  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(req.body);
    res.json({ message: 'Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.' });
  },

  async resetPassword(req: Request, res: Response) {
    const user = await authService.resetPassword(req.body);
    startSession(res, user);
    res.json({ user: toPublicUser(user) });
  },

  async changePassword(req: Request, res: Response) {
    const data = z
      .object({ currentPassword: z.string().max(128).default(''), newPassword: passwordSchema })
      .parse(req.body);
    const user = await authService.changePassword(req.user!.id, data.currentPassword, data.newPassword);
    startSession(res, user); // renova a sessão atual (as demais são encerradas)
    res.json({ message: 'Senha alterada com sucesso.' });
  },

  providers(_req: Request, res: Response) {
    res.json({ google: googleEnabled });
  },

  // ---------------- Login com Google (OAuth 2.0 / OpenID Connect) ----------------

  googleStart(_req: Request, res: Response) {
    if (!googleEnabled) throw AppError.notFound('Login com Google não está configurado.');
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 10 * 60 * 1000,
      path: '/',
    });
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI(),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  },

  async googleCallback(req: Request, res: Response) {
    const fail = (reason: string) => res.redirect(`${env.WEB_URL}/entrar?erro=${encodeURIComponent(reason)}`);
    if (!googleEnabled) return fail('google_desativado');

    const { code, state } = req.query as { code?: string; state?: string };
    const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
    if (!code || !state || state !== expectedState) return fail('estado_invalido');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI(),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) return fail('google_falhou');
    const tokens = (await tokenRes.json()) as { access_token?: string };

    const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) return fail('google_falhou');
    const profile = (await profileRes.json()) as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };
    if (!profile.email) return fail('sem_email');

    try {
      const user = await authService.loginWithGoogle({
        sub: profile.sub,
        email: profile.email,
        emailVerified: Boolean(profile.email_verified),
        name: profile.name ?? '',
      });
      startSession(res, user);
      res.redirect(`${env.WEB_URL}/conta`);
    } catch (error) {
      if (error instanceof AppError) return fail('conta_existente');
      throw error;
    }
  },
};
