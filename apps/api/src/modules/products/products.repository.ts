import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

/** Campos usados nos cards do catálogo. */
export const productCardInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' }, take: 1 },
  variants: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { priceCents: 'asc' }] },
} satisfies Prisma.ProductInclude;

export const productDetailInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' } },
  variants: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { priceCents: 'asc' }] },
} satisfies Prisma.ProductInclude;

export const adminProductInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' } },
  variants: { orderBy: [{ sortOrder: 'asc' }, { priceCents: 'asc' }] },
} satisfies Prisma.ProductInclude;

export type ProductCard = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

export const productsRepository = {
  async list(where: Prisma.ProductWhereInput, orderBy: Prisma.ProductOrderByWithRelationInput[], skip: number, take: number) {
    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({ where, orderBy, skip, take, include: productCardInclude }),
      prisma.product.count({ where }),
    ]);
    return { items, total };
  },

  findBySlug: (slug: string) =>
    prisma.product.findUnique({ where: { slug }, include: productDetailInclude }),

  findByIdAdmin: (id: string) => prisma.product.findUnique({ where: { id }, include: adminProductInclude }),

  slugExists: async (slug: string, exceptId?: string) =>
    Boolean(await prisma.product.findFirst({ where: { slug, NOT: exceptId ? { id: exceptId } : undefined }, select: { id: true } })),

  ratingSummary: async (productId: string) => {
    const agg = await prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { _all: true },
    });
    return { average: agg._avg.rating ?? 0, count: agg._count._all };
  },

  approvedReviews: (productId: string) =>
    prisma.review.findMany({
      where: { productId, isApproved: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, authorName: true, rating: true, comment: true, createdAt: true },
    }),

  related: (categoryId: string, excludeId: string) =>
    prisma.product.findMany({
      where: { categoryId, isActive: true, id: { not: excludeId } },
      include: productCardInclude,
      take: 4,
      orderBy: { isFeatured: 'desc' },
    }),
};
