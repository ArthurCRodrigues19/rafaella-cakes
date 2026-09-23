import type { Payment } from '@prisma/client';
import { formatCustomOrderNumber, formatOrderNumber } from '../../utils/text';
import { dateToISO } from '../../utils/dates';
import type { OrderDetail } from './orders.repository';

/** Pagamento sem os dados brutos do gateway. */
export function toPaymentDTO(p: Payment) {
  return {
    id: p.id,
    method: p.method,
    status: p.status,
    statusDetail: p.statusDetail,
    amountCents: p.amountCents,
    provider: p.provider,
    pixQrCode: p.pixQrCode,
    pixQrCodeBase64: p.pixQrCodeBase64,
    pixTicketUrl: p.pixTicketUrl,
    pixExpiresAt: p.pixExpiresAt,
    createdAt: p.createdAt,
  };
}

export function toOrderDTO(o: OrderDetail) {
  return {
    id: o.id,
    number: formatOrderNumber(o.code),
    status: o.status,
    fulfillmentType: o.fulfillmentType,
    paymentMethod: o.paymentMethod,
    scheduledDate: dateToISO(o.scheduledDate),
    subtotalCents: o.subtotalCents,
    shippingCents: o.shippingCents,
    discountCents: o.discountCents,
    totalCents: o.totalCents,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    shippingAddress: o.shippingAddress,
    shippingZone: o.shippingZone,
    notes: o.notes,
    paidAt: o.paidAt,
    createdAt: o.createdAt,
    customOrder: o.customOrder
      ? { id: o.customOrder.id, number: formatCustomOrderNumber(o.customOrder.code) }
      : null,
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      variantName: i.variantName,
      imageUrl: i.imageUrl,
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
      totalCents: i.totalCents,
    })),
    statusHistory: o.statusHistory.map((h) => ({ status: h.status, note: h.note, createdAt: h.createdAt })),
    payments: o.payments.map(toPaymentDTO),
  };
}
