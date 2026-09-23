'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { ORDER_STATUS, formatBRL, formatDateTime, whatsappLink } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { OrderSummaryCard } from '@/components/orders/OrderSummaryCard';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert, OrderStatusBadge, Spinner } from '@/components/ui';

// Próximo passo sugerido para cada status (botão de ação rápida)
const NEXT: Partial<Record<OrderStatus, (delivery: boolean) => OrderStatus>> = {
  RECEIVED: () => 'IN_PREPARATION',
  IN_PREPARATION: () => 'READY',
  READY: (delivery) => (delivery ? 'OUT_FOR_DELIVERY' : 'DELIVERED'),
  OUT_FOR_DELIVERY: () => 'DELIVERED',
};

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<OrderStatus>('RECEIVED');
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<Order>(`/admin/orders/${id}`)
      .then((o) => {
        setOrder(o);
        setStatus(o.status);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [id]);
  useEffect(load, [load]);

  async function updateStatus(next: OrderStatus) {
    setSaving(true);
    try {
      const o = await api<Order>(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status: next, note: note || undefined, notify } });
      setOrder(o);
      setStatus(o.status);
      setNote('');
      toast(`Status atualizado: ${ORDER_STATUS[next].label}`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!order) return <div className="skeleton h-96" />;

  const nextStatus = NEXT[order.status]?.(order.fulfillmentType === 'DELIVERY');
  const paid = order.payments.find((p) => p.status === 'APPROVED');

  return (
    <>
      <Link href="/admin/pedidos" className="text-sm text-cocoa-400 hover:text-cocoa-700">
        ← Pedidos
      </Link>
      <AdminPageHeader
        title={`Pedido ${order.number}`}
        subtitle={`Criado em ${formatDateTime(order.createdAt)}`}
        actions={<OrderStatusBadge status={order.status} />}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <OrderSummaryCard order={order} />
          {order.customOrder && (
            <Alert tone="info">
              Pedido gerado a partir da encomenda{' '}
              <Link href={`/admin/encomendas/${order.customOrder.id}`} className="link">
                {order.customOrder.number}
              </Link>
              .
            </Alert>
          )}
        </div>

        <div className="space-y-6">
          <section className="card space-y-4 p-6">
            <h2 className="heading-md text-xl">Atualizar status</h2>
            {nextStatus && (
              <button type="button" className="btn-primary w-full" disabled={saving} onClick={() => updateStatus(nextStatus)}>
                {saving && <Spinner />} Marcar como “{ORDER_STATUS[nextStatus].label}”
              </button>
            )}
            <div>
              <label htmlFor="status" className="label">
                Ou escolha o status
              </label>
              <select id="status" className="input" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                {Object.entries(ORDER_STATUS).map(([value, s]) => (
                  <option key={value} value={value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="note" className="label">
                Recado para o cliente (opcional)
              </label>
              <textarea id="note" rows={2} className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Avisar o cliente por e-mail
            </label>
            <button type="button" className="btn-outline w-full" disabled={saving || status === order.status} onClick={() => updateStatus(status)}>
              Salvar status
            </button>
          </section>

          <section className="card space-y-2 p-6 text-sm">
            <h2 className="heading-md mb-2 text-xl">Cliente</h2>
            <p className="font-medium text-cocoa-800">{order.customerName}</p>
            <p>
              <a href={`mailto:${order.customerEmail}`} className="link">
                {order.customerEmail}
              </a>
            </p>
            {order.customerPhone && (
              <p>
                <a href={whatsappLink(`55${order.customerPhone.replace(/\D/g, '')}`, `Olá, ${order.customerName.split(' ')[0]}! Aqui é da Rafaella Cakes, sobre o pedido ${order.number}.`)} target="_blank" rel="noopener noreferrer" className="link">
                  {order.customerPhone} (WhatsApp)
                </a>
              </p>
            )}
          </section>

          <section className="card space-y-2 p-6 text-sm">
            <h2 className="heading-md mb-2 text-xl">Pagamento</h2>
            <p>
              Método: <strong>{order.paymentMethod === 'PIX' ? 'Pix' : 'Cartão de crédito'}</strong>
            </p>
            {paid ? (
              <p className="text-emerald-700">
                Pago {formatBRL(paid.amountCents)} {order.paidAt && `em ${formatDateTime(order.paidAt)}`} {paid.provider === 'mock' && '(demonstração)'}
              </p>
            ) : (
              <p className="text-amber-700">Aguardando pagamento</p>
            )}
            {order.payments.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-cocoa-400">
                {order.payments.map((p) => (
                  <li key={p.id}>
                    {formatDateTime(p.createdAt)} · {p.method} · {p.status}
                    {p.statusDetail ? ` (${p.statusDetail})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-6 text-sm">
            <h2 className="heading-md mb-4 text-xl">Histórico</h2>
            <ol className="space-y-3">
              {order.statusHistory.map((h, i) => (
                <li key={i} className="border-l-2 border-blush-200 pl-3">
                  <p className="font-medium text-cocoa-700">{ORDER_STATUS[h.status].label}</p>
                  <p className="text-xs text-cocoa-400">
                    {formatDateTime(h.createdAt)}
                    {h.note ? ` · ${h.note}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
