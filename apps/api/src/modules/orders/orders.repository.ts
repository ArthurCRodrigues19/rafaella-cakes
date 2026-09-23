import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export const orderDetailInclude = {
  items: true,
  statusHistory: { orderBy: { createdAt: 'asc' } },
  payments: { orderBy: { createdAt: 'desc' } },
  customOrder: { select: { id: true, code: true } },
} satisfies Prisma.OrderInclude;

export type OrderDetail = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

export const ordersRepository = {
  findDetail: (id: string) => prisma.order.findUnique({ where: { id }, include: orderDetailInclude }),

  listByUser: (userId: string) =>
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: { select: { productName: true, quantity: true, imageUrl: true } } },
    }),

  async listAdmin(where: Prisma.OrderWhereInput, skip: number, take: number) {
    const [items, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { _count: { select: { items: true } } },
      }),
      prisma.order.count({ where }),
    ]);
    return { items, total };
  },
};
