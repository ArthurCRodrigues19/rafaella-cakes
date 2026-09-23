'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { useToast } from '@/components/providers/ToastProvider';
import { EmptyState, Stars } from '@/components/ui';

interface AdminReview {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  isFeatured: boolean;
  createdAt: string;
  product: { name: string; slug: string } | null;
  user: { email: string } | null;
}

export default function AdminReviewsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<'pending' | 'approved' | ''>('pending');
  const [list, setList] = useState<AdminReview[] | null>(null);

  const load = useCallback(() => {
    api<AdminReview[]>(`/admin/reviews?status=${filter}`).then(setList).catch(() => setList([]));
  }, [filter]);
  useEffect(load, [load]);

  async function update(r: AdminReview, data: Partial<Pick<AdminReview, 'isApproved' | 'isFeatured'>>) {
    try {
      await api(`/admin/reviews/${r.id}`, { method: 'PATCH', body: data });
      toast('Avaliação atualizada.');
      load();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  async function remove(r: AdminReview) {
    if (!window.confirm('Excluir esta avaliação?')) return;
    await api(`/admin/reviews/${r.id}`, { method: 'DELETE' }).catch(() => {});
    load();
  }

  return (
    <>
      <AdminPageHeader title="Avaliações" subtitle="Aprove as avaliações antes de aparecerem no site. As marcadas como depoimento aparecem na home e na galeria." />
      <div className="mb-6 flex gap-2">
        {(
          [
            ['pending', 'Aguardando aprovação'],
            ['approved', 'Aprovadas'],
            ['', 'Todas'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-2 text-xs ${filter === value ? 'bg-cocoa-700 text-cream' : 'bg-white text-cocoa-600 ring-1 ring-blush-100'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {!list ? (
        <div className="skeleton h-64" />
      ) : list.length === 0 ? (
        <EmptyState title="Nada por aqui" />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {list.map((r) => (
            <li key={r.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-cocoa-800">{r.authorName}</p>
                  <p className="text-xs text-cocoa-400">
                    {r.product?.name ?? 'Geral'} · {formatDate(r.createdAt)}
                    {r.user ? ` · ${r.user.email}` : ''}
                  </p>
                </div>
                <Stars value={r.rating} size={14} />
              </div>
              <p className="mt-3 flex-1 text-sm text-cocoa-600">{r.comment}</p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-blush-100 pt-4">
                {r.isApproved ? (
                  <button type="button" className="btn-outline btn-sm" onClick={() => update(r, { isApproved: false, isFeatured: false })}>
                    Ocultar
                  </button>
                ) : (
                  <button type="button" className="btn-primary btn-sm" onClick={() => update(r, { isApproved: true })}>
                    Aprovar
                  </button>
                )}
                <button type="button" className="btn-outline btn-sm" onClick={() => update(r, { isFeatured: !r.isFeatured, isApproved: true })}>
                  {r.isFeatured ? 'Remover dos depoimentos' : 'Destacar como depoimento'}
                </button>
                <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => remove(r)}>
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
