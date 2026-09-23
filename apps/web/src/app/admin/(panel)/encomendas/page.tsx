'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CUSTOM_STATUS, formatBRL, formatDate } from '@/lib/format';
import type { CustomOrder, CustomOrderStatus } from '@/lib/types';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { CustomStatusBadge, EmptyState } from '@/components/ui';

export default function AdminCustomOrdersPage() {
  const [status, setStatus] = useState('ALL');
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [list, setList] = useState<CustomOrder[] | null>(null);

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('status');
    if (s) setStatus(s);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams({ status });
    if (search) params.set('q', search);
    api<CustomOrder[]>(`/admin/custom-orders?${params}`).then(setList).catch(() => setList([]));
  }, [status, search, ready]);

  return (
    <>
      <AdminPageHeader title="Encomendas personalizadas" subtitle="Solicitações de orçamento feitas pelo site, ordenadas pela data do evento." />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {['ALL', ...Object.keys(CUSTOM_STATUS)].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs transition ${status === s ? 'bg-cocoa-700 text-cream' : 'bg-white text-cocoa-600 ring-1 ring-blush-100'}`}
            >
              {s === 'ALL' ? 'Todas' : CUSTOM_STATUS[s as CustomOrderStatus].label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q);
          }}
          className="flex gap-2"
        >
          <label htmlFor="co-search" className="sr-only">
            Buscar encomendas
          </label>
          <input id="co-search" className="input py-2" placeholder="Cliente ou evento" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-primary btn-sm">Buscar</button>
        </form>
      </div>

      {!list ? (
        <div className="skeleton h-80" />
      ) : list.length === 0 ? (
        <EmptyState title="Nenhuma encomenda encontrada" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Cliente</th>
                <th>Detalhes</th>
                <th>Status</th>
                <th className="text-right">Orçamento</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/encomendas/${c.id}`} className="font-medium text-cocoa-800 hover:text-blush-600">
                      {c.eventType}
                    </Link>
                    <span className="block text-xs text-cocoa-400">
                      {formatDate(c.eventDate)} · {c.number}
                    </span>
                  </td>
                  <td>
                    {c.customerName}
                    <span className="block text-xs text-cocoa-400">{c.customerPhone}</span>
                  </td>
                  <td className="text-xs text-cocoa-500">
                    {c.guests} pessoas · {c.flavor}
                    {c.size ? ` · ${c.size}` : ''}
                  </td>
                  <td>
                    <CustomStatusBadge status={c.status} />
                  </td>
                  <td className="text-right font-medium">{c.quotedPriceCents !== null ? formatBRL(c.quotedPriceCents) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
