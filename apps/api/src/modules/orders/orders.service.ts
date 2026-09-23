import { z } from 'zod';
import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { ISO_DATE_REGEX, WEEKDAY_NAMES, formatDateBR, isoToDate, weekdayOf } from '../../utils/dates';
import { optionalText, safeText } from '../../utils/text';
import { sendMailInBackground } from '../../lib/mailer';
import { orderStatusEmail } from '../../lib/emailTemplates';
import type { AuthUser } from '../../types/express';
import { addressSchema } from '../users/address.schema';
import { quoteShipping } from '../shipping/shipping.service';
import { cartItemsSchema, deliveryWindow, priceItems } from './pricing';
import { ordersRepository } from './orders.repository';
import { toOrderDTO } from './orders.dto';

export const createOrderSchema = z.object({
  items: cartItemsSchema.min(1, 'Seu carrinho está vazio.'),
  fulfillmentType: z.enum(['DELIVERY', 'PICKUP']),
  paymentMethod: z.enum(['PIX', 'CARD']),
  scheduledDate: z.string().regex(ISO_DATE_REGEX, 'Escolha a data de entrega/retirada'),
  addressId: z.string().optional(),
  address: addressSchema.optional(),
  saveAddress: z.boolean().default(false),
  phone: safeText(30).optional(),
  notes: optionalText(1000),
});

/** Garante que a data escolhida respeita prazo mínimo e dias de funcionamento. */
export function assertValidDate(date: string, earliest: string, openWeekdays: number[]) {
  if (date < earliest) {
    throw AppError.badRequest(`A data mais próxima disponível é ${formatDateBR(earliest)}.`, {
      scheduledDate: 'Data antes do prazo mínimo',
    });
  }
  if (openWeekdays.length && !openWeekdays.includes(weekdayOf(date))) {
    const days = openWeekdays.map((d) => WEEKDAY_NAMES[d]).join(', ');
    throw AppError.badRequest(`Fazemos entregas/retiradas apenas: ${days}.`, {
      scheduledDate: 'Dia sem atendimento',
    });
  }
}

export const ordersService = {
  async create(user: AuthUser, input: unknown) {
    const data = createOrderSchema.parse(input);

    const priced = await priceItems(data.items);
    if (priced.problems.length) {
      throw new AppError(409, priced.problems[0].message, 'CART_PROBLEMS', priced.problems);
    }
    if (!priced.lines.length) throw AppError.badRequest('Seu carrinho está vazio.');

    const { settings, earliestDate, openWeekdays } = await deliveryWindow(priced.lines);
    if (data.fulfillmentType === 'DELIVERY' && !settings.deliveryEnabled) {
      throw AppError.badRequest('No momento estamos trabalhando apenas com retirada.');
    }
    if (data.fulfillmentType === 'PICKUP' && !settings.pickupEnabled) {
      throw AppError.badRequest('No momento estamos trabalhando apenas com entregas.');
    }
    assertValidDate(data.scheduledDate, earliestDate, openWeekdays);

    // ---------- endereço e frete ----------
    let shippingCents = 0;
    let shippingZone: string | null = null;
    let shippingAddress: Prisma.InputJsonValue | undefined;

    if (data.fulfillmentType === 'DELIVERY') {
      let address = data.address;
      if (data.addressId) {
        const saved = await prisma.address.findFirst({ where: { id: data.addressId, userId: user.id } });
        if (!saved) throw AppError.badRequest('Endereço não encontrado.');
        address = addressSchema.parse(saved);
      }
      if (!address) throw AppError.badRequest('Informe o endereço de entrega.', { address: 'Obrigatório' });

      const quote = await quoteShipping(address.zipCode, address.neighborhood);
      if (!quote.deliverable) {
        throw AppError.badRequest(
          'Ainda não entregamos neste endereço. Você pode escolher a retirada na loja.',
          { zipCode: 'Fora da área de entrega' },
        );
      }
      shippingCents = quote.feeCents;
      shippingZone = quote.zoneName;
      shippingAddress = { ...address } as Prisma.InputJsonValue;

      if (data.saveAddress && data.address) {
        await prisma.address.create({ data: { ...data.address, userId: user.id } });
      }
    }

    const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (data.phone && !dbUser.phone) {
      await prisma.user.update({ where: { id: user.id }, data: { phone: data.phone } });
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        fulfillmentType: data.fulfillmentType,
        paymentMethod: data.paymentMethod,
        scheduledDate: isoToDate(data.scheduledDate),
        subtotalCents: priced.subtotalCents,
        shippingCents,
        totalCents: priced.subtotalCents + shippingCents,
        customerName: dbUser.name,
        customerEmail: dbUser.email,
        customerPhone: data.phone || dbUser.phone,
        shippingAddress,
        shippingZone,
        notes: data.notes,
        items: {
          create: priced.lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            productName: l.productName,
            variantName: l.variantName,
            imageUrl: l.imageUrl,
            unitPriceCents: l.unitPriceCents,
            quantity: l.quantity,
            totalCents: l.totalCents,
          })),
        },
        statusHistory: { create: { status: 'PENDING_PAYMENT', note: 'Pedido criado' } },
      },
    });

    // O carrinho salvo é esvaziado após o pedido
    await prisma.cartItem.deleteMany({ where: { userId: user.id } });

    return { id: order.id };
  },

  async listMine(userId: string) {
    const orders = await ordersRepository.listByUser(userId);
    return orders.map((o) => ({
      id: o.id,
      number: `RC${String(o.code).padStart(5, '0')}`,
      status: o.status,
      totalCents: o.totalCents,
      fulfillmentType: o.fulfillmentType,
      scheduledDate: o.scheduledDate.toISOString().slice(0, 10),
      createdAt: o.createdAt,
      items: o.items,
    }));
  },

  /** Detalhe do pedido (dono ou admin). */
  async getForUser(user: AuthUser, id: string) {
    const order = await ordersRepository.findDetail(id);
    if (!order || (order.userId !== user.id && user.role !== 'ADMIN')) {
      throw AppError.notFound('Pedido não encontrado.');
    }
    return order;
  },

  // ---------------- admin ----------------

  async adminList(rawQuery: unknown) {
    const q = z
      .object({
        status: z.string().optional(),
        q: z.string().trim().max(80).optional(),
        page: z.coerce.number().int().min(1).default(1),
      })
      .parse(rawQuery);

    const where: Prisma.OrderWhereInput = {};
    if (q.status && q.status !== 'ALL') where.status = q.status as OrderStatus;
    if (q.q) {
      const code = Number(q.q.replace(/\D/g, ''));
      where.OR = [
        { customerName: { contains: q.q, mode: 'insensitive' } },
        { customerEmail: { contains: q.q, mode: 'insensitive' } },
        ...(code ? [{ code }] : []),
      ];
    }
    const pageSize = 20;
    const { items, total } = await ordersRepository.listAdmin(where, (q.page - 1) * pageSize, pageSize);
    return {
      items: items.map((o) => ({
        id: o.id,
        number: `RC${String(o.code).padStart(5, '0')}`,
        status: o.status,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        totalCents: o.totalCents,
        fulfillmentType: o.fulfillmentType,
        paymentMethod: o.paymentMethod,
        scheduledDate: o.scheduledDate.toISOString().slice(0, 10),
        itemCount: o._count.items,
        createdAt: o.createdAt,
      })),
      total,
      page: q.page,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  async adminUpdateStatus(id: string, input: unknown) {
    const data = z
      .object({
        status: z.enum(['PENDING_PAYMENT', 'RECEIVED', 'IN_PREPARATION', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELED']),
        note: optionalText(300),
        notify: z.boolean().default(true),
      })
      .parse(input);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw AppError.notFound('Pedido não encontrado.');
    if (order.status === data.status) return toOrderDTO((await ordersRepository.findDetail(id))!);

    await prisma.$transaction([
      prisma.order.update({ where: { id }, data: { status: data.status } }),
      prisma.orderStatusHistory.create({ data: { orderId: id, status: data.status, note: data.note } }),
    ]);

    if (data.notify) {
      sendMailInBackground({ to: order.customerEmail, ...orderStatusEmail(order, data.status, data.note) });
    }
    return toOrderDTO((await ordersRepository.findDetail(id))!);
  },
};
