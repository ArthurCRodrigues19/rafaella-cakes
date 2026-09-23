import { z } from 'zod';
import type { CustomOrder, CustomOrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { ISO_DATE_REGEX, addDaysISO, dateToISO, formatDateBR, isoToDate, todayISO } from '../../utils/dates';
import { formatCustomOrderNumber, optionalText, requiredText } from '../../utils/text';
import { sendMailInBackground } from '../../lib/mailer';
import {
  customOrderAdminEmail,
  customOrderQuotedEmail,
  customOrderReceivedEmail,
  customOrderStatusEmail,
} from '../../lib/emailTemplates';
import type { AuthUser } from '../../types/express';
import { getSettings } from '../settings/settings.service';
import { addressSchema } from '../users/address.schema';

const STATUSES = ['REQUESTED', 'QUOTED', 'APPROVED', 'IN_PREPARATION', 'READY', 'DELIVERED', 'REJECTED', 'CANCELED'] as const;

export const createCustomOrderSchema = z.object({
  customerName: requiredText(100, 'Nome'),
  customerEmail: z.string().trim().toLowerCase().email('E-mail inválido').max(160),
  customerPhone: requiredText(30, 'Telefone/WhatsApp'),
  eventType: requiredText(60, 'Tipo de evento'),
  eventDate: z.string().regex(ISO_DATE_REGEX, 'Informe a data do evento'),
  guests: z.coerce.number().int().min(1, 'Mínimo de 1 pessoa').max(2000),
  size: optionalText(60),
  flavor: requiredText(120, 'Sabor da massa'),
  filling: optionalText(160),
  frosting: optionalText(160),
  fulfillmentType: z.enum(['DELIVERY', 'PICKUP']).default('PICKUP'),
  notes: optionalText(2000),
});

export function toCustomOrderDTO(c: CustomOrder & { order?: { id: string; status: string } | null }) {
  return {
    id: c.id,
    number: formatCustomOrderNumber(c.code),
    customerName: c.customerName,
    customerEmail: c.customerEmail,
    customerPhone: c.customerPhone,
    eventType: c.eventType,
    eventDate: dateToISO(c.eventDate),
    guests: c.guests,
    size: c.size,
    flavor: c.flavor,
    filling: c.filling,
    frosting: c.frosting,
    fulfillmentType: c.fulfillmentType,
    notes: c.notes,
    referenceImageUrl: c.referenceImageUrl,
    status: c.status,
    quotedPriceCents: c.quotedPriceCents,
    quoteMessage: c.quoteMessage,
    createdAt: c.createdAt,
    order: c.order ? { id: c.order.id, status: c.order.status } : null,
  };
}

export const customOrdersService = {
  async create(user: AuthUser | undefined, body: unknown, referenceImageUrl: string | null) {
    const data = createCustomOrderSchema.parse(body);
    const settings = await getSettings();
    const minDate = addDaysISO(todayISO(), settings.customMinLeadDays);
    if (data.eventDate < minDate) {
      throw AppError.badRequest(
        `Para encomendas personalizadas precisamos de pelo menos ${settings.customMinLeadDays} dias de antecedência (a partir de ${formatDateBR(minDate)}).`,
        { eventDate: 'Data muito próxima' },
      );
    }

    const created = await prisma.customOrder.create({
      data: {
        ...data,
        eventDate: isoToDate(data.eventDate),
        referenceImageUrl,
        userId: user?.id ?? null,
        statusHistory: { create: { status: 'REQUESTED', note: 'Solicitação enviada pelo site' } },
      },
    });

    sendMailInBackground({ to: created.customerEmail, ...customOrderReceivedEmail(created) });
    sendMailInBackground({ to: env.STORE_NOTIFY_EMAIL, replyTo: created.customerEmail, ...customOrderAdminEmail(created) });
    return { id: created.id, number: formatCustomOrderNumber(created.code) };
  },

  /** Encomendas do cliente — inclui as feitas sem login com o mesmo e-mail. */
  async listMine(user: AuthUser) {
    const list = await prisma.customOrder.findMany({
      where: { OR: [{ userId: user.id }, { userId: null, customerEmail: user.email.toLowerCase() }] },
      orderBy: { createdAt: 'desc' },
      include: { order: { select: { id: true, status: true } } },
    });
    return list.map(toCustomOrderDTO);
  },

  async findMine(user: AuthUser, id: string) {
    const c = await prisma.customOrder.findUnique({ where: { id }, include: { order: { select: { id: true, status: true } } } });
    const owns = c && (c.userId === user.id || (!c.userId && c.customerEmail === user.email.toLowerCase()));
    if (!c || !owns) throw AppError.notFound('Encomenda não encontrada.');
    return c;
  },

  /**
   * Cliente aceita o orçamento: gera um pedido com o valor combinado,
   * que segue o mesmo fluxo de pagamento da loja (Pix/cartão).
   */
  async accept(user: AuthUser, id: string, body: unknown) {
    const c = await this.findMine(user, id);
    if (c.order) return { orderId: c.order.id };
    if (c.status !== 'QUOTED' || !c.quotedPriceCents) {
      throw AppError.conflict('Este orçamento não está disponível para aprovação.');
    }

    const input = z
      .object({ paymentMethod: z.enum(['PIX', 'CARD']).default('PIX'), addressId: z.string().optional() })
      .parse(body ?? {});

    let shippingAddress: Prisma.InputJsonValue | undefined;
    if (c.fulfillmentType === 'DELIVERY') {
      if (!input.addressId) throw AppError.badRequest('Escolha o endereço de entrega.', { addressId: 'Obrigatório' });
      const saved = await prisma.address.findFirst({ where: { id: input.addressId, userId: user.id } });
      if (!saved) throw AppError.badRequest('Endereço não encontrado.');
      shippingAddress = addressSchema.parse(saved) as Prisma.InputJsonValue;
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        customOrderId: c.id,
        fulfillmentType: c.fulfillmentType,
        paymentMethod: input.paymentMethod,
        scheduledDate: c.eventDate,
        subtotalCents: c.quotedPriceCents,
        shippingCents: 0, // a entrega já é considerada no orçamento
        totalCents: c.quotedPriceCents,
        customerName: c.customerName,
        customerEmail: c.customerEmail,
        customerPhone: c.customerPhone,
        shippingAddress,
        notes: `Encomenda personalizada ${formatCustomOrderNumber(c.code)}`,
        items: {
          create: {
            productName: `Encomenda personalizada · ${c.eventType}`,
            variantName: [c.size, c.flavor, `${c.guests} pessoas`].filter(Boolean).join(' · '),
            imageUrl: c.referenceImageUrl,
            unitPriceCents: c.quotedPriceCents,
            quantity: 1,
            totalCents: c.quotedPriceCents,
          },
        },
        statusHistory: { create: { status: 'PENDING_PAYMENT', note: 'Orçamento aprovado pelo cliente' } },
      },
    });
    // Vincula a encomenda à conta, se foi feita sem login
    if (!c.userId) await prisma.customOrder.update({ where: { id: c.id }, data: { userId: user.id } });
    return { orderId: order.id };
  },

  async decline(user: AuthUser, id: string) {
    const c = await this.findMine(user, id);
    if (!['REQUESTED', 'QUOTED'].includes(c.status)) {
      throw AppError.conflict('Esta encomenda não pode mais ser cancelada pelo site. Fale conosco.');
    }
    await prisma.$transaction([
      prisma.customOrder.update({ where: { id }, data: { status: 'CANCELED' } }),
      prisma.customOrderStatusHistory.create({ data: { customOrderId: id, status: 'CANCELED', note: 'Cancelada pelo cliente' } }),
    ]);
  },

  // ---------------- admin ----------------

  async adminList(rawQuery: unknown) {
    const q = z.object({ status: z.string().optional(), q: z.string().trim().max(80).optional() }).parse(rawQuery);
    const where: Prisma.CustomOrderWhereInput = {};
    if (q.status && q.status !== 'ALL') where.status = q.status as CustomOrderStatus;
    if (q.q) {
      where.OR = [
        { customerName: { contains: q.q, mode: 'insensitive' } },
        { customerEmail: { contains: q.q, mode: 'insensitive' } },
        { eventType: { contains: q.q, mode: 'insensitive' } },
      ];
    }
    const list = await prisma.customOrder.findMany({
      where,
      orderBy: [{ eventDate: 'asc' }],
      include: { order: { select: { id: true, status: true } } },
      take: 200,
    });
    return list.map(toCustomOrderDTO);
  },

  async adminGet(id: string) {
    const c = await prisma.customOrder.findUnique({
      where: { id },
      include: {
        order: { select: { id: true, status: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!c) throw AppError.notFound('Encomenda não encontrada.');
    return {
      ...toCustomOrderDTO(c),
      adminNotes: c.adminNotes,
      statusHistory: c.statusHistory.map((h) => ({ status: h.status, note: h.note, createdAt: h.createdAt })),
    };
  },

  async adminUpdate(id: string, body: unknown) {
    const data = z
      .object({
        status: z.enum(STATUSES).optional(),
        quotedPriceCents: z.coerce.number().int().min(0).max(100_000_000).nullable().optional(),
        quoteMessage: optionalText(2000),
        adminNotes: optionalText(4000),
        notify: z.boolean().default(true),
      })
      .parse(body);

    const current = await prisma.customOrder.findUnique({ where: { id } });
    if (!current) throw AppError.notFound('Encomenda não encontrada.');

    if (data.status === 'QUOTED' && !(data.quotedPriceCents ?? current.quotedPriceCents)) {
      throw AppError.badRequest('Defina o valor do orçamento antes de enviá-lo.', { quotedPriceCents: 'Obrigatório' });
    }

    // Só altera os textos que vieram na requisição (permite apagá-los enviando "")
    const sent = (key: string) => typeof body === 'object' && body !== null && key in body;
    const statusChanged = data.status && data.status !== current.status;
    const updated = await prisma.customOrder.update({
      where: { id },
      data: {
        status: data.status,
        quotedPriceCents: data.quotedPriceCents === undefined ? undefined : data.quotedPriceCents,
        quoteMessage: sent('quoteMessage') ? data.quoteMessage : undefined,
        adminNotes: sent('adminNotes') ? data.adminNotes : undefined,
        statusHistory: statusChanged ? { create: { status: data.status!, note: 'Atualizado pela Rafaella' } } : undefined,
      },
    });

    // O orçamento é (re)enviado sempre que o status QUOTED for salvo; demais status, só quando mudam
    if (data.notify && (data.status === 'QUOTED' || statusChanged)) {
      const email =
        updated.status === 'QUOTED' ? customOrderQuotedEmail(updated) : customOrderStatusEmail(updated, updated.status);
      sendMailInBackground({ to: updated.customerEmail, ...email });
    }
    return this.adminGet(id);
  },
};
