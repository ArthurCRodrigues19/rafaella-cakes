import { prisma } from '../../lib/prisma';

const PAID_STATUSES = ['RECEIVED', 'IN_PREPARATION', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;

function monthStart(offset = 0) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

export const dashboardService = {
  async summary() {
    const start = monthStart();
    const prevStart = monthStart(-1);
    const sixMonthsAgo = monthStart(-5);
    const paidWhere = { status: { in: [...PAID_STATUSES] } };

    const [monthAgg, prevAgg, toPrepare, pendingCustom, pendingReviews, newCustomers, recentOrders, topRaw, lastSixMonths] =
      await Promise.all([
        prisma.order.aggregate({
          where: { ...paidWhere, paidAt: { gte: start } },
          _count: { _all: true },
          _sum: { totalCents: true },
        }),
        prisma.order.aggregate({
          where: { ...paidWhere, paidAt: { gte: prevStart, lt: start } },
          _count: { _all: true },
          _sum: { totalCents: true },
        }),
        prisma.order.count({ where: { status: { in: ['RECEIVED', 'IN_PREPARATION'] } } }),
        prisma.customOrder.count({ where: { status: 'REQUESTED' } }),
        prisma.review.count({ where: { isApproved: false } }),
        prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: start } } }),
        prisma.order.findMany({
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: { id: true, code: true, customerName: true, totalCents: true, status: true, createdAt: true, scheduledDate: true },
        }),
        prisma.orderItem.groupBy({
          by: ['productId'],
          where: { productId: { not: null }, order: paidWhere },
          _sum: { quantity: true, totalCents: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
        prisma.order.findMany({
          where: { ...paidWhere, paidAt: { gte: sixMonthsAgo } },
          select: { paidAt: true, totalCents: true },
        }),
      ]);

    const products = await prisma.product.findMany({
      where: { id: { in: topRaw.map((t) => t.productId!).filter(Boolean) } },
      select: { id: true, name: true, slug: true },
    });
    const topProducts = topRaw.map((t) => ({
      productId: t.productId,
      name: products.find((p) => p.id === t.productId)?.name ?? 'Produto removido',
      quantity: t._sum.quantity ?? 0,
      revenueCents: t._sum.totalCents ?? 0,
    }));

    // Faturamento por mês (últimos 6 meses)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = monthStart(i - 5);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('pt-BR', { month: 'short' }), revenueCents: 0, orders: 0 };
    });
    for (const o of lastSixMonths) {
      if (!o.paidAt) continue;
      const m = months.find((x) => x.key === `${o.paidAt!.getFullYear()}-${o.paidAt!.getMonth()}`);
      if (m) {
        m.revenueCents += o.totalCents;
        m.orders += 1;
      }
    }

    const ordersThisMonth = monthAgg._count._all;
    const revenueThisMonth = monthAgg._sum.totalCents ?? 0;

    return {
      ordersThisMonth,
      revenueThisMonthCents: revenueThisMonth,
      averageTicketCents: ordersThisMonth ? Math.round(revenueThisMonth / ordersThisMonth) : 0,
      ordersLastMonth: prevAgg._count._all,
      revenueLastMonthCents: prevAgg._sum.totalCents ?? 0,
      ordersToPrepare: toPrepare,
      pendingCustomOrders: pendingCustom,
      pendingReviews,
      newCustomersThisMonth: newCustomers,
      topProducts,
      revenueByMonth: months.map(({ key: _key, ...m }) => m),
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        number: `RC${String(o.code).padStart(5, '0')}`,
        customerName: o.customerName,
        totalCents: o.totalCents,
        status: o.status,
        createdAt: o.createdAt,
        scheduledDate: o.scheduledDate.toISOString().slice(0, 10),
      })),
    };
  },

  async customers(q?: string) {
    const users = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        OR: q
          ? [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { orders: true, customOrders: true } },
      },
    });
    const totals = await prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: users.map((u) => u.id) }, status: { in: [...PAID_STATUSES] } },
      _sum: { totalCents: true },
      _max: { paidAt: true },
    });
    return users.map((u) => {
      const t = totals.find((x) => x.userId === u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        createdAt: u.createdAt,
        orders: u._count.orders,
        customOrders: u._count.customOrders,
        totalSpentCents: t?._sum.totalCents ?? 0,
        lastOrderAt: t?._max.paidAt ?? null,
      };
    });
  },
};
