import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { requiredText } from '../../utils/text';
import type { AuthUser } from '../../types/express';

export const reviewInputSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Dê de 1 a 5 estrelas').max(5, 'Dê de 1 a 5 estrelas'),
  comment: requiredText(1000, 'Comentário'),
});

export const reviewsService = {
  /** Cria/atualiza a avaliação do cliente. Sempre volta para moderação. */
  async upsert(user: AuthUser, productSlug: string, input: unknown) {
    const data = reviewInputSchema.parse(input);
    const product = await prisma.product.findUnique({ where: { slug: productSlug }, select: { id: true } });
    if (!product) throw AppError.notFound('Produto não encontrado.');

    return prisma.review.upsert({
      where: { userId_productId: { userId: user.id, productId: product.id } },
      create: {
        userId: user.id,
        productId: product.id,
        authorName: user.name,
        rating: data.rating,
        comment: data.comment,
      },
      update: { rating: data.rating, comment: data.comment, isApproved: false },
    });
  },

  /** Depoimentos exibidos na home e na galeria. */
  testimonials: (limit = 6) =>
    prisma.review.findMany({
      where: { isApproved: true, isFeatured: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        authorName: true,
        rating: true,
        comment: true,
        createdAt: true,
        product: { select: { name: true, slug: true } },
      },
    }),

  // ------------- admin -------------
  adminList: (status?: string) =>
    prisma.review.findMany({
      where: status === 'pending' ? { isApproved: false } : status === 'approved' ? { isApproved: true } : {},
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true, slug: true } }, user: { select: { email: true } } },
      take: 200,
    }),

  adminUpdate: (id: string, input: unknown) => {
    const data = z.object({ isApproved: z.boolean().optional(), isFeatured: z.boolean().optional() }).parse(input);
    return prisma.review.update({ where: { id }, data });
  },

  adminRemove: (id: string) => prisma.review.delete({ where: { id } }),
};
