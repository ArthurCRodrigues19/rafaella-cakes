'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { formatBRL, formatDate } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { useAuth } from '@/components/providers/AuthProvider';
import { Alert, OrderStatusBadge } from '@/components/ui';

interface Dashboard {
  ordersThisMonth: number;
  revenueThisMonthCents: number;
  averageTicketCents: number;
  ordersLastMonth: number;
  revenueLastMonthCents: number;
  ordersToPrepare: number;
  pendingCustomOrders: number;
  pendingReviews: number;
  newCustomersThisMonth: number;
  topProducts: { productId: string | null; name: string; quantity: number; revenueCents: number }[];
  revenueByMonth: { label: string; revenueCents: number; orders: number }[];
  recentOrders: { id: string; number: string; customerName: string; totalCents: number; status: OrderStatus; scheduledDate: string }[];
}

function variation(current: number, previous: number) {
  if (!previous) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct, up: pct >= 0 };
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Dashboard>('/admin/dashboard').then(setData).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return <div className="skeleton h-96" />;

  const revVar = variation(data.revenueThisMonthCents, data.revenueLastMonthCents);
  const maxRevenue = Math.max(1, ...data.revenueByMonth.map((m) => m.revenueCents));
  const maxQty = Math.max(1, ...data.topProducts.map((p) => p.quantity));

  const stats = [
    { label: 'Faturamento do mês', value: formatBRL(data.revenueThisMonthCents), note: revVar ? `${revVar.up ? '▲' : '▼'} ${Math.abs(revVar.pct)}% vs. mês anterior` : 'pedidos pagos' },
    { label: 'Pedidos no mês', value: String(data.ordersThisMonth), note: `${data.ordersLastMonth} no mês anterior` },
    { label: 'Ticket médio', value: formatBRL(data.averageTicketCents), note: 'por pedido pago' },
    { label: 'Novos clientes', value: String(data.newCustomersThisMonth), note: 'cadastros no mês' },
  ];

  const todo = [
    { href: '/admin/pedidos?status=RECEIVED', label: 'pedidos para preparar', count: data.ordersToPrepare },
    { href: '/admin/encomendas?status=REQUESTED', label: 'encomendas aguardando orçamento', count: data.pendingCustomOrders },
    { href: '/admin/avaliacoes', label: 'avaliações para aprovar', count: data.pendingReviews },
  ];

  return (
    <>
      <AdminPageHeader title={`Olá, ${user?.name.split(' ')[0] ?? ''}! 👋`} subtitle="Um resumo de como a loja está indo." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-xs uppercase tracking-wider text-cocoa-400">{s.label}</p>
            <p className="mt-2 font-serif text-3xl text-cocoa-800">{s.value}</p>
            <p className="mt-1 text-xs text-cocoa-400">{s.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {todo.map((t) => (
          <Link key={t.href} href={t.href} className={`card flex items-center gap-4 p-5 transition hover:shadow-soft ${t.count ? 'ring-2 ring-blush-200' : ''}`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl font-serif text-2xl ${t.count ? 'bg-blush-600 text-white' : 'bg-blush-50 text-cocoa-400'}`}>
              {t.count}
            </span>
            <span className="text-sm text-cocoa-600">{t.label}</span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="card p-6" aria-labelledby="fat-title">
          <h2 id="fat-title" className="heading-md mb-6 text-xl">
            Faturamento · últimos 6 meses
          </h2>
          <div className="flex h-56 items-end gap-3" role="list">
            {data.revenueByMonth.map((m) => (
              <div key={m.label} role="listitem" className="flex flex-1 flex-col items-center gap-2" aria-label={`${m.label}: ${formatBRL(m.revenueCents)}, ${m.orders} pedidos`}>
                <span className="text-[0.65rem] text-cocoa-400">{m.revenueCents ? formatBRL(m.revenueCents).replace(',00', '') : ''}</span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-xl bg-gradient-to-t from-blush-400 to-blush-200 transition-all"
                    style={{ height: `${Math.max(2, (m.revenueCents / maxRevenue) * 100)}%` }}
                  />
                </div>
                <span className="text-xs capitalize text-cocoa-500">{m.label.replace('.', '')}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6" aria-labelledby="top-title">
          <h2 id="top-title" className="heading-md mb-6 text-xl">
            Mais vendidos
          </h2>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-cocoa-400">Ainda não há vendas registradas.</p>
          ) : (
            <ol className="space-y-4">
              {data.topProducts.map((p, i) => (
                <li key={p.productId ?? i}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-cocoa-700">
                      {i + 1}. {p.name}
                    </span>
                    <span className="text-cocoa-400">
                      {p.quantity} un · {formatBRL(p.revenueCents)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-blush-50">
                    <div className="h-full rounded-full bg-champagne-400" style={{ width: `${(p.quantity / maxQty) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="card mt-6 overflow-hidden" aria-labelledby="recent-title">
        <div className="flex items-center justify-between p-6 pb-2">
          <h2 id="recent-title" className="heading-md text-xl">
            Pedidos recentes
          </h2>
          <Link href="/admin/pedidos" className="link text-sm">
            Ver todos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Data</th>
                <th>Status</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/pedidos/${o.id}`} className="font-medium text-cocoa-800 hover:text-blush-600">
                      {o.number}
                    </Link>
                  </td>
                  <td>{o.customerName}</td>
                  <td>{formatDate(o.scheduledDate)}</td>
                  <td>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="text-right font-medium">{formatBRL(o.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
