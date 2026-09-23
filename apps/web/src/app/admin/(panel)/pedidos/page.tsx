'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ORDER_STATUS, formatBRL, formatDate, formatDateTime } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { EmptyState, OrderStatusBadge } from '@/components/ui';

interface AdminOrderRow {
  id: string;
  number: string;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  paymentMethod: 'PIX' | 'CARD';
  scheduledDate: string;
  itemCount: number;
  createdAt: string;
}

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('ALL');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: AdminOrderRow[]; total: number; totalPages: number } | null>(null);

  const [ready, setReady] = useState(false);

  // Lê o filtro inicial da URL (ex.: vindo do dashboard)
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('status');
    if (s) setStatus(s);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams({ status, page: String(page) });
    if (search) params.set('q', search);
    api<typeof data>(`/admin/orders?${params}`).then(setData).catch(() => setData({ items: [], total: 0, totalPages: 1 }));
  }, [status, search, page, ready]);

  return (
    <>
      <AdminPageHeader title="Pedidos da loja" subtitle={data ? `${data.total} pedido(s)` : undefined} />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {['ALL', ...Object.keys(ORDER_STATUS)].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-xs transition ${status === s ? 'bg-cocoa-700 text-cream' : 'bg-white text-cocoa-600 ring-1 ring-blush-100'}`}
            >
              {s === 'ALL' ? 'Todos' : ORDER_STATUS[s as OrderStatus].label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q);
            setPage(1);
          }}
          className="flex gap-2"
        >
          <label htmlFor="order-search" className="sr-only">
            Buscar pedidos
          </label>
          <input id="order-search" className="input py-2" placeholder="Nº, nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-primary btn-sm">Buscar</button>
        </form>
      </div>

      {!data ? (
        <div className="skeleton h-80" />
      ) : data.items.length === 0 ? (
        <EmptyState title="Nenhum pedido encontrado" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Entrega/retirada</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/pedidos/${o.id}`} className="font-medium text-cocoa-800 hover:text-blush-600">
                      {o.number}
                    </Link>
                    <span className="block text-xs text-cocoa-400">{formatDateTime(o.createdAt)}</span>
                  </td>
                  <td>
                    {o.customerName}
                    <span className="block text-xs text-cocoa-400">{o.customerEmail}</span>
                  </td>
                  <td>
                    {formatDate(o.scheduledDate)}
                    <span className="block text-xs text-cocoa-400">{o.fulfillmentType === 'PICKUP' ? 'Retirada' : 'Entrega'}</span>
                  </td>
                  <td>{o.paymentMethod === 'PIX' ? 'Pix' : 'Cartão'}</td>
                  <td>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="text-right font-medium">{formatBRL(o.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </button>
          <span className="px-3 py-2 text-sm text-cocoa-500">
            {page} de {data.totalPages}
          </span>
          <button type="button" className="btn-outline btn-sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
            Próxima
          </button>
        </div>
      )}
    </>
  );
}
