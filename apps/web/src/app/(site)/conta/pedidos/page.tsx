'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatBRL, formatDate } from '@/lib/format';
import type { OrderSummary } from '@/lib/types';
import { SafeImage } from '@/components/SafeImage';
import { EmptyState, OrderStatusBadge } from '@/components/ui';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);

  useEffect(() => {
    api<OrderSummary[]>('/me/orders').then(setOrders).catch(() => setOrders([]));
  }, []);

  if (!orders) return <div className="skeleton h-64" />;
  if (!orders.length) {
    return (
      <EmptyState title="Você ainda não fez pedidos" action={<Link href="/produtos" className="btn-primary">Ver o cardápio</Link>}>
        Quando fizer seu primeiro pedido, ele aparecerá aqui com o status atualizado.
      </EmptyState>
    );
  }

  return (
    <ul className="space-y-4">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/conta/pedidos/${o.id}`} className="card flex flex-col gap-4 p-5 transition hover:shadow-soft sm:flex-row sm:items-center">
            <div className="flex -space-x-3">
              {o.items.slice(0, 3).map((i, idx) => (
                <span key={idx} className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-white bg-blush-100">
                  <SafeImage src={i.imageUrl} alt={i.productName} fill sizes="56px" className="object-cover" />
                </span>
              ))}
            </div>
            <div className="flex-1">
              <p className="font-serif text-lg text-cocoa-800">Pedido {o.number}</p>
              <p className="text-sm text-cocoa-400">
                {o.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}
              </p>
              <p className="mt-1 text-xs text-cocoa-400">
                {o.fulfillmentType === 'PICKUP' ? 'Retirada' : 'Entrega'} em {formatDate(o.scheduledDate)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
              <OrderStatusBadge status={o.status} />
              <span className="font-semibold text-cocoa-800">{formatBRL(o.totalCents)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
