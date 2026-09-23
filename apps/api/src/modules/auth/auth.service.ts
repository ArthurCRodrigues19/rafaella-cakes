import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { sendMailInBackground } from '../../lib/mailer';
import { passwordResetEmail, welcomeEmail } from '../../lib/emailTemplates';
import { usersRepository } from '../users/users.repository';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from './auth.schemas';

const BCRYPT_ROUNDS = 12;
// Hash "falso" para comparar quando o e-mail não existe (evita descobrir e-mails pelo tempo de resposta)
const DUMMY_HASH = bcrypt.hashSync('rafaella-dummy-password', BCRYPT_ROUNDS);

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export function toPublicUser(user: Pick<User, 'id' | 'name' | 'email' | 'phone' | 'role' | 'googleId' | 'createdAt'>) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    hasGoogle: Boolean(user.googleId),
    createdAt: user.createdAt,
  };
}

export const authService = {
  async register(input: unknown) {
    const data = registerSchema.parse(input);
    const existing = await usersRepository.findByEmail(data.email);
    if (existing) throw AppError.conflict('Já existe uma conta com este e-mail. Que tal fazer login?');

    const user = await usersRepository.create({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      passwordHash: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
    });
    sendMailInBackground({ to: user.email, ...welcomeEmail(user.name) });
    return user;
  },

  async login(input: unknown, opts: { adminOnly?: boolean } = {}) {
    const data = loginSchema.parse(input);
    const user = await usersRepository.findByEmail(data.email);
    const ok = await bcrypt.compare(data.password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !user.passwordHash || !ok) {
      throw AppError.unauthorized('E-mail ou senha incorretos.');
    }
    if (opts.adminOnly && user.role !== 'ADMIN') {
      throw AppError.forbidden('Esta área é exclusiva da administração.');
    }
    return user;
  },

  async forgotPassword(input: unknown) {
    const { email } = forgotPasswordSchema.parse(input);
    const user = await usersRepository.findByEmail(email);
    // Sempre respondemos a mesma coisa, exista ou não a conta.
    if (!user) return;

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const link = `${env.WEB_URL}/redefinir-senha?token=${token}`;
    sendMailInBackground({ to: user.email, ...passwordResetEmail(user.name, link) });
  },

  async resetPassword(input: unknown) {
    const { token, password } = resetPasswordSchema.parse(input);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw AppError.badRequest('Este link expirou ou já foi usado. Solicite um novo.');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [user] = await prisma.$transaction([
      // tokenVersion++ encerra todas as sessões abertas
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    return user;
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await usersRepository.findById(userId);
    if (!user) throw AppError.notFound();
    if (user.passwordHash && !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw AppError.badRequest('A senha atual está incorreta.');
    }
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS), tokenVersion: { increment: 1 } },
    });
  },

  /** Encontra ou cria o usuário vindo do Google. Vincula a conta existente se o e-mail for verificado. */
  async loginWithGoogle(profile: { sub: string; email: string; emailVerified: boolean; name: string }) {
    const byGoogle = await usersRepository.findByGoogleId(profile.sub);
    if (byGoogle) return byGoogle;

    const byEmail = await usersRepository.findByEmail(profile.email);
    if (byEmail) {
      if (!profile.emailVerified) {
        throw AppError.conflict('Já existe uma conta com este e-mail. Entre com sua senha.');
      }
      return usersRepository.update(byEmail.id, { googleId: profile.sub });
    }

    const user = await usersRepository.create({
      name: profile.name || profile.email.split('@')[0],
      email: profile.email.toLowerCase(),
      googleId: profile.sub,
    });
    sendMailInBackground({ to: user.email, ...welcomeEmail(user.name) });
    return user;
  },
};
