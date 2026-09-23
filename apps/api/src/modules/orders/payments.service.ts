import { z } from 'zod';
import type { PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env, isProd } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { formatOrderNumber } from '../../utils/text';
import { paymentGateway, type GatewayPayment } from '../../lib/paymentGateway';
import { sendMailInBackground } from '../../lib/mailer';
import { newOrderAdminEmail, orderConfirmedEmail } from '../../lib/emailTemplates';
import type { AuthUser } from '../../types/express';
import { toPaymentDTO } from './orders.dto';

export const payOrderSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('PIX') }),
  z.object({
    method: z.literal('CARD'),
    token: z.string().min(1).max(300),
    paymentMethodId: z.string().max(40).default('visa'),
    installments: z.coerce.number().int().min(1).max(12).default(1),
    issuerId: z.union([z.string(), z.number()]).optional(),
    identification: z.object({ type: z.string().max(10), number: z.string().max(20) }).optional(),
  }),
]);

/**
 * Aplica o novo status de um pagamento. Quando aprovado, e só uma vez por pedido:
 * - pedido passa para RECEBIDO
 * - estoque é baixado
 * - encomenda personalizada vinculada passa para APROVADA
 * - e-mails de confirmação são enviados
 */
export async function syncPaymentStatus(
  paymentId: string,
  update: { status: PaymentStatus; statusDetail?: string; raw?: unknown },
) {
  const approvedOrderId = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: update.status,
        statusDetail: update.statusDetail,
        raw: update.raw === undefined ? undefined : (update.raw as Prisma.InputJsonValue),
      },
      include: { order: { include: { items: true } } },
    });
    if (update.status !== 'APPROVED') return null;

    const order = payment.order;
    // updateMany condicional: se dois webhooks chegarem juntos, só um "vence"
    const changed = await tx.order.updateMany({
      where: { id: order.id, status: 'PENDING_PAYMENT' },
      data: { status: 'RECEIVED', paidAt: new Date() },
    });
    if (changed.count === 0) return null;

    await tx.orderStatusHistory.create({
      data: { orderId: order.id, status: 'RECEIVED', note: `Pagamento aprovado (${payment.method === 'PIX' ? 'Pix' : 'cartão'})` },
    });

    for (const item of order.items) {
      if (!item.variantId) continue;
      await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { not: null } },
        data: { stock: { decrement: item.quantity } },
      });
    }

    if (order.customOrderId) {
      await tx.customOrder.update({ where: { id: order.customOrderId }, data: { status: 'APPROVED' } });
      await tx.customOrderStatusHistory.create({
        data: { customOrderId: order.customOrderId, status: 'APPROVED', note: 'Pagamento confirmado' },
      });
    }
    return order.id;
  });

  if (approvedOrderId) {
    const order = await prisma.order.findUnique({ where: { id: approvedOrderId }, include: { items: true } });
    if (order) {
      sendMailInBackground({ to: order.customerEmail, ...orderConfirmedEmail(order) });
      sendMailInBackground({ to: env.STORE_NOTIFY_EMAIL, ...newOrderAdminEmail(order) });
    }
  }
}

async function saveGatewayPayment(orderId: string, method: 'PIX' | 'CARD', amountCents: number, gp: GatewayPayment) {
  const payment = await prisma.payment.create({
    data: {
      orderId,
      method,
      amountCents,
      provider: paymentGateway.mode,
      providerPaymentId: gp.providerPaymentId,
      status: 'PENDING',
      statusDetail: gp.statusDetail,
      pixQrCode: gp.pixQrCode,
      pixQrCodeBase64: gp.pixQrCodeBase64,
      pixTicketUrl: gp.pixTicketUrl,
      pixExpiresAt: gp.pixExpiresAt,
      raw: gp.raw === undefined ? undefined : (gp.raw as Prisma.InputJsonValue),
    },
  });
  if (gp.status !== 'PENDING') {
    await syncPaymentStatus(payment.id, { status: gp.status, statusDetail: gp.statusDetail });
  }
  return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
}

export const paymentsService = {
  config() {
    return { provider: paymentGateway.mode, publicKey: env.MP_PUBLIC_KEY || null };
  },

  async pay(user: AuthUser, orderId: string, input: unknown) {
    const data = payOrderSchema.parse(input);
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
    });
    if (!order) throw AppError.notFound('Pedido não encontrado.');
    if (order.status !== 'PENDING_PAYMENT') throw AppError.conflict('Este pedido já foi pago ou cancelado.');

    const description = `Rafaella Cakes — pedido ${formatOrderNumber(order.code)}`;
    const payer = { email: order.customerEmail, firstName: order.customerName.split(' ')[0] };

    if (data.method === 'PIX') {
      // Reaproveita um Pix pendente ainda válido (evita gerar vários QR codes)
      const reusable = order.payments.find(
        (p) => p.method === 'PIX' && p.status === 'PENDING' && p.pixExpiresAt && p.pixExpiresAt > new Date(),
      );
      if (reusable) return toPaymentDTO(reusable);

      const gp = await paymentGateway.createPix({ orderId: order.id, amountCents: order.totalCents, description, payer });
      await prisma.order.update({ where: { id: order.id }, data: { paymentMethod: 'PIX' } });
      return toPaymentDTO(await saveGatewayPayment(order.id, 'PIX', order.totalCents, gp));
    }

    const gp = await paymentGateway.createCard({
      orderId: order.id,
      amountCents: order.totalCents,
      description,
      payer,
      token: data.token,
      paymentMethodId: data.paymentMethodId,
      installments: data.installments,
      issuerId: data.issuerId === undefined ? undefined : String(data.issuerId),
      identification: data.identification,
    });
    await prisma.order.update({ where: { id: order.id }, data: { paymentMethod: 'CARD' } });
    return toPaymentDTO(await saveGatewayPayment(order.id, 'CARD', order.totalCents, gp));
  },

  /**
   * Consulta o gateway quando há pagamento pendente. Útil no ambiente local,
   * onde o webhook do Mercado Pago não consegue alcançar "localhost".
   */
  async refreshPending(orderId: string) {
    const pending = await prisma.payment.findFirst({
      where: { orderId, status: 'PENDING', provider: 'mercadopago', providerPaymentId: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending?.providerPaymentId) return;
    if (Date.now() - pending.updatedAt.getTime() < 4000) return; // evita consultar em excesso
    try {
      const gp = await paymentGateway.fetchPayment(pending.providerPaymentId);
      if (gp) await syncPaymentStatus(pending.id, { status: gp.status, statusDetail: gp.statusDetail, raw: gp.raw });
    } catch (error) {
      console.warn('[payments] falha ao atualizar status', (error as Error).message);
    }
  },

  /** Webhook do Mercado Pago. O status é sempre confirmado consultando a API (não confiamos no corpo). */
  async handleWebhook(dataId: string, signature?: string, requestId?: string) {
    if (!paymentGateway.verifyWebhookSignature(signature, requestId, dataId)) {
      throw AppError.unauthorized('Assinatura do webhook inválida.');
    }
    const gp = await paymentGateway.fetchPayment(dataId);
    if (!gp) return;
    const payment = await prisma.payment.findUnique({ where: { providerPaymentId: gp.providerPaymentId } });
    if (!payment) throw AppError.notFound('Pagamento ainda não registrado.'); // o MP tentará novamente
    await syncPaymentStatus(payment.id, { status: gp.status, statusDetail: gp.statusDetail, raw: gp.raw });
  },

  /** Somente no modo de demonstração: aprova o pagamento pendente do pedido. */
  async simulateApproval(user: AuthUser, orderId: string) {
    if (paymentGateway.mode !== 'mock' || isProd) throw AppError.forbidden('Disponível apenas no modo de demonstração.');
    const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id } });
    if (!order) throw AppError.notFound('Pedido não encontrado.');
    if (order.status !== 'PENDING_PAYMENT') throw AppError.conflict('Este pedido já foi pago ou cancelado.');

    let payment = await prisma.payment.findFirst({ where: { orderId, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
    if (!payment) {
      payment = await prisma.payment.create({
        data: { orderId, method: order.paymentMethod, amountCents: order.totalCents, provider: 'mock', status: 'PENDING' },
      });
    }
    await syncPaymentStatus(payment.id, { status: 'APPROVED', statusDetail: 'simulated' });
  },
};
