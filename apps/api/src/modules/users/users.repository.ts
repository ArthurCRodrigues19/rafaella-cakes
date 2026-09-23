import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

/** Dados do usuário que podem ser devolvidos ao front (sem hash de senha). */
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
  googleId: true,
} satisfies Prisma.UserSelect;

export const usersRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email: email.toLowerCase() } }),

  findById: (id: string) => prisma.user.findUnique({ where: { id } }),

  findPublicById: (id: string) => prisma.user.findUnique({ where: { id }, select: publicUserSelect }),

  findByGoogleId: (googleId: string) => prisma.user.findUnique({ where: { googleId } }),

  create: (data: Prisma.UserCreateInput) => prisma.user.create({ data }),

  update: (id: string, data: Prisma.UserUpdateInput) => prisma.user.update({ where: { id }, data }),
};
