import type { CustomOrderStatus, OrderStatus } from './types';

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** "2026-09-23" → "23/09/2026" (sem conversão de fuso) */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** "2026-09-23" → "quarta-feira, 23 de setembro" */
export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatCep(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Converte "12,50" ou "12.50" em centavos */
export function parseBRL(value: string): number {
  const clean = value.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(clean);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export const centsToInput = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? '' : (cents / 100).toFixed(2).replace('.', ',');

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  PENDING_PAYMENT: { label: 'Aguardando pagamento', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  RECEIVED: { label: 'Pedido recebido', tone: 'bg-sky-50 text-sky-800 ring-sky-200' },
  IN_PREPARATION: { label: 'Em preparo', tone: 'bg-violet-50 text-violet-800 ring-violet-200' },
  READY: { label: 'Pronto', tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  OUT_FOR_DELIVERY: { label: 'Saiu para entrega', tone: 'bg-teal-50 text-teal-800 ring-teal-200' },
  DELIVERED: { label: 'Entregue', tone: 'bg-cocoa-50 text-cocoa-700 ring-cocoa-200' },
  CANCELED: { label: 'Cancelado', tone: 'bg-red-50 text-red-700 ring-red-200' },
};

export const CUSTOM_STATUS: Record<CustomOrderStatus, { label: string; tone: string }> = {
  REQUESTED: { label: 'Aguardando orçamento', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  QUOTED: { label: 'Orçamento enviado', tone: 'bg-blush-100 text-blush-700 ring-blush-200' },
  APPROVED: { label: 'Aprovada e paga', tone: 'bg-sky-50 text-sky-800 ring-sky-200' },
  IN_PREPARATION: { label: 'Em preparo', tone: 'bg-violet-50 text-violet-800 ring-violet-200' },
  READY: { label: 'Pronta', tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  DELIVERED: { label: 'Entregue', tone: 'bg-cocoa-50 text-cocoa-700 ring-cocoa-200' },
  REJECTED: { label: 'Não disponível', tone: 'bg-red-50 text-red-700 ring-red-200' },
  CANCELED: { label: 'Cancelada', tone: 'bg-red-50 text-red-700 ring-red-200' },
};

export const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

export function whatsappLink(number: string, text?: string) {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
