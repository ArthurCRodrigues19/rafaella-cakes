import crypto from 'node:crypto';
import { env, paymentsMode } from '../config/env';
import { AppError } from '../utils/AppError';
import type { PaymentStatus } from '@prisma/client';

/**
 * Abstração do gateway de pagamento.
 * - "mercadopago": usa a API REST oficial (https://api.mercadopago.com/v1/payments)
 * - "mock": modo de demonstração, sem cobranças reais (quando MP_ACCESS_TOKEN está vazio)
 */

export interface GatewayPayment {
  providerPaymentId: string;
  status: PaymentStatus;
  statusDetail?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  pixTicketUrl?: string;
  pixExpiresAt?: Date;
  raw?: unknown;
}

interface BaseInput {
  orderId: string;
  amountCents: number;
  description: string;
  payer: { email: string; firstName: string };
}

export interface PixInput extends BaseInput {}

export interface CardInput extends BaseInput {
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId?: string;
  identification?: { type: string; number: string };
}

const MP_API = 'https://api.mercadopago.com/v1/payments';

function mapStatus(status: string): PaymentStatus {
  switch (status) {
    case 'approved':
      return 'APPROVED';
    case 'rejected':
      return 'REJECTED';
    case 'cancelled':
      return 'CANCELED';
    case 'refunded':
    case 'charged_back':
      return 'REFUNDED';
    default:
      return 'PENDING'; // pending, in_process, authorized...
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toGatewayPayment(data: any): GatewayPayment {
  const tx = data?.point_of_interaction?.transaction_data;
  return {
    providerPaymentId: String(data.id),
    status: mapStatus(data.status),
    statusDetail: data.status_detail,
    pixQrCode: tx?.qr_code,
    pixQrCodeBase64: tx?.qr_code_base64,
    pixTicketUrl: tx?.ticket_url,
    pixExpiresAt: data.date_of_expiration ? new Date(data.date_of_expiration) : undefined,
    raw: data,
  };
}

async function mpRequest(url: string, init: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[mercadopago] erro', res.status, data);
    throw new AppError(
      502,
      'Não foi possível processar o pagamento agora. Confira os dados ou tente outro método.',
      'PAYMENT_GATEWAY_ERROR',
    );
  }
  return data;
}

/** Só enviamos notification_url se ela for pública (https) — o MP recusa localhost. */
const notificationUrl = () =>
  env.MP_NOTIFICATION_URL.startsWith('https://') ? env.MP_NOTIFICATION_URL : undefined;

const toAmount = (cents: number) => Math.round(cents) / 100;

export const paymentGateway = {
  mode: paymentsMode,

  async createPix(input: PixInput): Promise<GatewayPayment> {
    if (paymentsMode === 'mock') {
      return {
        providerPaymentId: `mock_${crypto.randomUUID()}`,
        status: 'PENDING',
        pixQrCode: `00020126580014BR.GOV.BCB.PIX0136RAFAELLA-CAKES-DEMO-${input.orderId}5204000053039865802BR5920RAFAELLA CAKES DEMO6009SAO PAULO`,
        pixExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      };
    }
    const expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const data = await mpRequest(MP_API, {
      method: 'POST',
      headers: { 'X-Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        transaction_amount: toAmount(input.amountCents),
        description: input.description,
        payment_method_id: 'pix',
        external_reference: input.orderId,
        notification_url: notificationUrl(),
        date_of_expiration: expiration,
        payer: { email: input.payer.email, first_name: input.payer.firstName },
      }),
    });
    return toGatewayPayment(data);
  },

  async createCard(input: CardInput): Promise<GatewayPayment> {
    if (paymentsMode === 'mock') {
      // No modo demo, o token "reject" simula uma recusa
      const approved = input.token !== 'reject';
      return {
        providerPaymentId: `mock_${crypto.randomUUID()}`,
        status: approved ? 'APPROVED' : 'REJECTED',
        statusDetail: approved ? 'accredited' : 'cc_rejected_other_reason',
      };
    }
    const data = await mpRequest(MP_API, {
      method: 'POST',
      headers: { 'X-Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        transaction_amount: toAmount(input.amountCents),
        token: input.token,
        description: input.description,
        installments: input.installments,
        payment_method_id: input.paymentMethodId,
        issuer_id: input.issuerId ? Number(input.issuerId) : undefined,
        external_reference: input.orderId,
        notification_url: notificationUrl(),
        payer: {
          email: input.payer.email,
          identification: input.identification,
        },
      }),
    });
    return toGatewayPayment(data);
  },

  async fetchPayment(providerPaymentId: string): Promise<GatewayPayment | null> {
    if (paymentsMode === 'mock' || providerPaymentId.startsWith('mock_')) return null;
    const data = await mpRequest(`${MP_API}/${encodeURIComponent(providerPaymentId)}`, { method: 'GET' });
    return toGatewayPayment(data);
  },

  /**
   * Valida a assinatura do webhook (header x-signature), conforme a documentação do MP:
   * manifest = "id:{data.id};request-id:{x-request-id};ts:{ts};"
   */
  verifyWebhookSignature(signature: string | undefined, requestId: string | undefined, dataId: string): boolean {
    if (!env.MP_WEBHOOK_SECRET) return true; // validação opcional
    if (!signature) return false;
    const parts = Object.fromEntries(
      signature.split(',').map((kv) => kv.trim().split('=') as [string, string]),
    );
    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) return false;
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId ?? ''};ts:${ts};`;
    const expected = crypto.createHmac('sha256', env.MP_WEBHOOK_SECRET).update(manifest).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
    } catch {
      return false;
    }
  },
};
