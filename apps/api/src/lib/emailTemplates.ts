import { env } from '../config/env';
import { escapeHtml as e, formatBRL, formatCustomOrderNumber, formatOrderNumber } from '../utils/text';
import { formatDateBR } from '../utils/dates';

/** Layout base dos e-mails, com a identidade visual da loja. */
function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;background:#FFF9F4;font-family:Helvetica,Arial,sans-serif;color:#4A3228;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF9F4;padding:32px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #F4D6D6;">
        <tr><td style="background:#F4D6D6;padding:28px;text-align:center;">
          <div style="font-family:Georgia,serif;font-size:28px;color:#4A3228;font-style:italic;">Rafaella Cakes</div>
          <div style="font-size:11px;letter-spacing:3px;color:#957444;margin-top:4px;">DOCERIA ARTESANAL</div>
        </td></tr>
        <tr><td style="padding:32px 28px;">
          <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:22px;margin:0 0 16px;">${title}</h1>
          ${body}
        </td></tr>
        <tr><td style="padding:20px 28px;background:#FBEAE8;font-size:12px;color:#7A5A4B;text-align:center;">
          Feito à mão com carinho · <a href="${env.WEB_URL}" style="color:#A95E65;">rafaellacakes.com.br</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:28px 0;text-align:center;"><a href="${href}" style="background:#4A3228;color:#FFF9F4;text-decoration:none;padding:14px 28px;border-radius:999px;display:inline-block;font-size:14px;">${e(label)}</a></p>`;

const p = (text: string) => `<p style="line-height:1.6;margin:0 0 12px;">${text}</p>`;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Aguardando pagamento',
  RECEIVED: 'Pedido recebido',
  IN_PREPARATION: 'Em preparo',
  READY: 'Pronto',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
};

export const CUSTOM_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Solicitação recebida',
  QUOTED: 'Orçamento enviado',
  APPROVED: 'Aprovada e paga',
  IN_PREPARATION: 'Em preparo',
  READY: 'Pronta',
  DELIVERED: 'Entregue',
  REJECTED: 'Não foi possível atender',
  CANCELED: 'Cancelada',
};

interface OrderForEmail {
  id: string;
  code: number;
  customerName: string;
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  scheduledDate: Date;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  items: { productName: string; variantName: string | null; quantity: number; totalCents: number }[];
}

export function orderConfirmedEmail(order: OrderForEmail) {
  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #FBEAE8;">${i.quantity}× ${e(i.productName)}${
          i.variantName ? `<br><span style="color:#98786A;font-size:12px;">${e(i.variantName)}</span>` : ''
        }</td>
        <td style="padding:8px 0;border-bottom:1px solid #FBEAE8;text-align:right;">${formatBRL(i.totalCents)}</td>
      </tr>`,
    )
    .join('');

  const when = order.fulfillmentType === 'PICKUP' ? 'Retirada' : 'Entrega';
  return {
    subject: `Pedido ${formatOrderNumber(order.code)} confirmado! 🎂`,
    html: layout(
      `Oba, ${e(order.customerName.split(' ')[0])}! Seu pedido foi confirmado.`,
      p(`Recebemos o pagamento do pedido <strong>${formatOrderNumber(order.code)}</strong> e já estamos nos organizando para prepará-lo com todo carinho.`) +
        p(`<strong>${when}:</strong> ${formatDateBR(order.scheduledDate)}`) +
        `<table width="100%" style="font-size:14px;margin:16px 0;">${rows}
          <tr><td style="padding-top:12px;">Subtotal</td><td style="padding-top:12px;text-align:right;">${formatBRL(order.subtotalCents)}</td></tr>
          <tr><td>Frete</td><td style="text-align:right;">${order.shippingCents ? formatBRL(order.shippingCents) : 'Grátis'}</td></tr>
          <tr><td style="font-weight:bold;padding-top:8px;">Total</td><td style="font-weight:bold;padding-top:8px;text-align:right;">${formatBRL(order.totalCents)}</td></tr>
        </table>` +
        button(`${env.WEB_URL}/conta/pedidos/${order.id}`, 'Acompanhar pedido'),
    ),
  };
}

export function orderStatusEmail(order: { id: string; code: number; customerName: string }, status: string, note?: string | null) {
  const label = ORDER_STATUS_LABELS[status] ?? status;
  return {
    subject: `Pedido ${formatOrderNumber(order.code)}: ${label}`,
    html: layout(
      `Atualização do seu pedido`,
      p(`Olá, ${e(order.customerName.split(' ')[0])}! O pedido <strong>${formatOrderNumber(order.code)}</strong> agora está: <strong>${e(label)}</strong>.`) +
        (note ? p(`<em>${e(note)}</em>`) : '') +
        button(`${env.WEB_URL}/conta/pedidos/${order.id}`, 'Ver detalhes'),
    ),
  };
}

export function newOrderAdminEmail(order: OrderForEmail) {
  return {
    subject: `Novo pedido pago: ${formatOrderNumber(order.code)} (${formatBRL(order.totalCents)})`,
    html: layout(
      'Novo pedido na loja',
      p(`${e(order.customerName)} fez o pedido ${formatOrderNumber(order.code)} para ${formatDateBR(order.scheduledDate)}.`) +
        button(`${env.WEB_URL}/admin/pedidos/${order.id}`, 'Abrir no painel'),
    ),
  };
}

export function passwordResetEmail(name: string, link: string) {
  return {
    subject: 'Redefinição de senha — Rafaella Cakes',
    html: layout(
      'Vamos criar uma nova senha?',
      p(`Olá, ${e(name.split(' ')[0])}! Recebemos um pedido para redefinir a senha da sua conta.`) +
        button(link, 'Criar nova senha') +
        p('<span style="font-size:13px;color:#98786A;">O link vale por 1 hora. Se não foi você, é só ignorar este e-mail.</span>'),
    ),
  };
}

export function welcomeEmail(name: string) {
  return {
    subject: 'Boas-vindas à Rafaella Cakes 💕',
    html: layout(
      `Que alegria ter você aqui, ${e(name.split(' ')[0])}!`,
      p('Sua conta foi criada. Agora você pode fazer pedidos, acompanhar encomendas e salvar seus doces favoritos.') +
        button(`${env.WEB_URL}/produtos`, 'Ver o cardápio'),
    ),
  };
}

interface CustomOrderForEmail {
  id: string;
  code: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  eventType: string;
  eventDate: Date;
  guests: number;
  flavor: string;
  quotedPriceCents: number | null;
  quoteMessage: string | null;
}

export function customOrderReceivedEmail(c: CustomOrderForEmail) {
  return {
    subject: `Recebemos sua encomenda ${formatCustomOrderNumber(c.code)} ✨`,
    html: layout(
      'Sua solicitação chegou!',
      p(`Olá, ${e(c.customerName.split(' ')[0])}! Recebemos o pedido de orçamento para <strong>${e(c.eventType)}</strong> em <strong>${formatDateBR(c.eventDate)}</strong> (${c.guests} pessoas).`) +
        p('A Rafaella vai analisar cada detalhe e enviar o orçamento em breve, por e-mail e na sua conta.') +
        button(`${env.WEB_URL}/conta/encomendas`, 'Minhas encomendas'),
    ),
  };
}

export function customOrderAdminEmail(c: CustomOrderForEmail) {
  return {
    subject: `Nova encomenda: ${formatCustomOrderNumber(c.code)} — ${c.eventType} em ${formatDateBR(c.eventDate)}`,
    html: layout(
      'Nova solicitação de encomenda',
      p(`<strong>${e(c.customerName)}</strong> · ${e(c.customerEmail)} · ${e(c.customerPhone)}`) +
        p(`${e(c.eventType)} · ${formatDateBR(c.eventDate)} · ${c.guests} pessoas · sabor ${e(c.flavor)}`) +
        button(`${env.WEB_URL}/admin/encomendas/${c.id}`, 'Abrir no painel'),
    ),
  };
}

export function customOrderQuotedEmail(c: CustomOrderForEmail) {
  return {
    subject: `Seu orçamento chegou: ${formatCustomOrderNumber(c.code)}`,
    html: layout(
      'Seu orçamento está pronto!',
      p(`Olá, ${e(c.customerName.split(' ')[0])}! Preparamos o orçamento da sua encomenda para ${formatDateBR(c.eventDate)}.`) +
        p(`<span style="font-size:22px;font-family:Georgia,serif;">${formatBRL(c.quotedPriceCents ?? 0)}</span>`) +
        (c.quoteMessage ? p(`<em>“${e(c.quoteMessage)}”</em> — Rafaella`) : '') +
        p('Para confirmar, acesse sua conta e finalize o pagamento. Se tiver dúvidas, é só responder este e-mail.') +
        button(`${env.WEB_URL}/conta/encomendas`, 'Ver e aprovar orçamento'),
    ),
  };
}

export function customOrderStatusEmail(c: CustomOrderForEmail, status: string) {
  const label = CUSTOM_STATUS_LABELS[status] ?? status;
  return {
    subject: `Encomenda ${formatCustomOrderNumber(c.code)}: ${label}`,
    html: layout(
      'Atualização da sua encomenda',
      p(`Olá, ${e(c.customerName.split(' ')[0])}! A encomenda <strong>${formatCustomOrderNumber(c.code)}</strong> agora está: <strong>${e(label)}</strong>.`) +
        (c.quoteMessage && status === 'REJECTED' ? p(`<em>${e(c.quoteMessage)}</em>`) : '') +
        button(`${env.WEB_URL}/conta/encomendas`, 'Ver minhas encomendas'),
    ),
  };
}

export function contactEmail(data: { name: string; email: string; phone?: string | null; message: string }) {
  return {
    subject: `Mensagem do site: ${data.name}`,
    html: layout(
      'Nova mensagem de contato',
      p(`<strong>${e(data.name)}</strong> · ${e(data.email)}${data.phone ? ` · ${e(data.phone)}` : ''}`) +
        p(e(data.message).replace(/\n/g, '<br>')),
    ),
  };
}
