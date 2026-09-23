'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { Order } from '@/lib/types';
import { Alert, OrderStatusBadge } from '../ui';
import { OrderTimeline } from './OrderTimeline';
import { OrderSummaryCard } from './OrderSummaryCard';
import { PaymentPanel } from './PaymentPanel';

export function CustomerOrderView({ id, isNew }: { id: string; isNew: boolean }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setOrder(await api<Order>(`/orders/${id}`));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Enquanto aguarda pagamento, consulta o status a cada 5s (Pix aprovado aparece sozinho)
  useEffect(() => {
    if (order?.status !== 'PENDING_PAYMENT') return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [order?.status, load]);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!order) return <div className="skeleton h-96" />;

  const paid = order.status !== 'PENDING_PAYMENT' && order.status !== 'CANCELED';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/conta/pedidos" className="text-sm text-cocoa-400 hover:text-cocoa-700">
            ← Meus pedidos
          </Link>
          <h2 className="heading-md mt-1">Pedido {order.number}</h2>
          <p className="text-xs text-cocoa-400">Feito em {formatDateTime(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {isNew && order.status === 'PENDING_PAYMENT' && (
        <Alert tone="success">Pedido criado! Agora é só concluir o pagamento abaixo. 💕</Alert>
      )}
      {paid && order.paidAt && (
        <Alert tone="success">
          Pagamento confirmado! Enviamos os detalhes para <strong>{order.customerEmail}</strong>.
        </Alert>
      )}
      {order.customOrder && (
        <p className="text-sm text-cocoa-500">
          Referente à encomenda personalizada{' '}
          <Link href="/conta/encomendas" className="link">
            {order.customOrder.number}
          </Link>
        </p>
      )}

      {order.status === 'PENDING_PAYMENT' && <PaymentPanel order={order} onChange={load} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <OrderSummaryCard order={order} />
        <div className="card h-fit p-6">
          <h2 className="heading-md mb-6 text-xl">Acompanhamento</h2>
          <OrderTimeline order={order} />
        </div>
      </div>
    </div>
  );
}
