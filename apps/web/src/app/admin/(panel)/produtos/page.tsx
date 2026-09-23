'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { formatBRL } from '@/lib/format';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { useToast } from '@/components/providers/ToastProvider';
import { SafeImage } from '@/components/SafeImage';
import { EmptyState } from '@/components/ui';
import { PlusIcon } from '@/components/icons';

interface Row {
  id: string;
  name: string;
  slug: string;
  priceFromCents: number;
  isActive: boolean;
  isFeatured: boolean;
  category: { name: string };
  images: { url: string; alt: string }[];
  variants: { id: string; stock: number | null; isActive: boolean }[];
}

export default function AdminProductsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback((query = '') => {
    api<Row[]>(`/admin/products${query ? `?q=${encodeURIComponent(query)}` : ''}`).then(setRows).catch(() => setRows([]));
  }, []);
  useEffect(() => load(), [load]);

  async function toggle(row: Row, field: 'isActive' | 'isFeatured') {
    try {
      await api(`/admin/products/${row.id}`, { method: 'PATCH', body: { [field]: !row[field] } });
      setRows((list) => list?.map((r) => (r.id === row.id ? { ...r, [field]: !row[field] } : r)) ?? null);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  const stockLabel = (r: Row) => {
    const tracked = r.variants.filter((v) => v.stock !== null);
    if (!tracked.length) return 'Sob encomenda';
    const total = tracked.reduce((s, v) => s + (v.stock ?? 0), 0);
    return total <= 0 ? 'Esgotado' : `${total} em estoque`;
  };

  return (
    <>
      <AdminPageHeader
        title="Produtos"
        subtitle={rows ? `${rows.length} produto(s) cadastrados` : undefined}
        actions={
          <Link href="/admin/produtos/novo" className="btn-primary">
            <PlusIcon width={16} /> Novo produto
          </Link>
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
        className="mb-6 flex max-w-md gap-2"
      >
        <label htmlFor="p-search" className="sr-only">
          Buscar produto
        </label>
        <input id="p-search" className="input py-2" placeholder="Buscar por nome" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-outline btn-sm">Buscar</button>
      </form>

      {!rows ? (
        <div className="skeleton h-80" />
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhum produto" action={<Link href="/admin/produtos/novo" className="btn-primary">Cadastrar o primeiro</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th className="text-center">Visível</th>
                <th className="text-center">Destaque</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/produtos/${r.id}`} className="flex items-center gap-3 font-medium text-cocoa-800 hover:text-blush-600">
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-blush-100">
                        <SafeImage src={r.images[0]?.url} alt="" fill sizes="48px" className="object-cover" />
                      </span>
                      {r.name}
                    </Link>
                  </td>
                  <td>{r.category.name}</td>
                  <td>
                    {r.variants.length > 1 && <span className="text-xs text-cocoa-400">a partir de </span>}
                    {formatBRL(r.priceFromCents)}
                  </td>
                  <td className="text-xs">{stockLabel(r)}</td>
                  <td className="text-center">
                    <input type="checkbox" className="checkbox" checked={r.isActive} onChange={() => toggle(r, 'isActive')} aria-label={`Visível: ${r.name}`} />
                  </td>
                  <td className="text-center">
                    <input type="checkbox" className="checkbox" checked={r.isFeatured} onChange={() => toggle(r, 'isFeatured')} aria-label={`Destaque: ${r.name}`} />
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
