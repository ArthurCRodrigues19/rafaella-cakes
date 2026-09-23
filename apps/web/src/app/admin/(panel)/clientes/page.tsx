'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatBRL, formatDate, whatsappLink } from '@/lib/format';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { EmptyState } from '@/components/ui';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  orders: number;
  customOrders: number;
  totalSpentCents: number;
  lastOrderAt: string | null;
}

export default function AdminCustomersPage() {
  const [list, setList] = useState<Customer[] | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback((query = '') => {
    api<Customer[]>(`/admin/customers${query ? `?q=${encodeURIComponent(query)}` : ''}`).then(setList).catch(() => setList([]));
  }, []);
  useEffect(() => load(), [load]);

  return (
    <>
      <AdminPageHeader title="Clientes" subtitle={list ? `${list.length} cliente(s) cadastrados` : undefined} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
        className="mb-6 flex max-w-md gap-2"
      >
        <label htmlFor="cust-search" className="sr-only">
          Buscar cliente
        </label>
        <input id="cust-search" className="input py-2" placeholder="Nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-outline btn-sm">Buscar</button>
      </form>

      {!list ? (
        <div className="skeleton h-80" />
      ) : list.length === 0 ? (
        <EmptyState title="Nenhum cliente encontrado" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contato</th>
                <th>Cadastro</th>
                <th className="text-center">Pedidos</th>
                <th className="text-center">Encomendas</th>
                <th className="text-right">Total gasto</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium text-cocoa-800">{c.name}</td>
                  <td>
                    <a href={`mailto:${c.email}`} className="link">
                      {c.email}
                    </a>
                    {c.phone && (
                      <a href={whatsappLink(`55${c.phone.replace(/\D/g, '')}`)} target="_blank" rel="noopener noreferrer" className="block text-xs text-cocoa-400 hover:text-cocoa-700">
                        {c.phone}
                      </a>
                    )}
                  </td>
                  <td>{formatDate(c.createdAt)}</td>
                  <td className="text-center">{c.orders}</td>
                  <td className="text-center">{c.customOrders}</td>
                  <td className="text-right font-medium">
                    {formatBRL(c.totalSpentCents)}
                    {c.lastOrderAt && <span className="block text-xs font-normal text-cocoa-400">último: {formatDate(c.lastOrderAt)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
