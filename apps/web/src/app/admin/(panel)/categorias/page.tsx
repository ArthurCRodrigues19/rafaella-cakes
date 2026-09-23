'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { Category } from '@/lib/types';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { useToast } from '@/components/providers/ToastProvider';
import { SafeImage } from '@/components/SafeImage';
import { Field, Spinner } from '@/components/ui';

type Draft = { id?: string; name: string; description: string; imageUrl: string; sortOrder: number };
const EMPTY: Draft = { name: '', description: '', imageUrl: '', sortOrder: 0 };

export default function AdminCategoriesPage() {
  const toast = useToast();
  const [list, setList] = useState<Category[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<Category[]>('/categories').then(setList).catch(() => {});
  }, []);
  useEffect(load, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { name: draft.name, description: draft.description, imageUrl: draft.imageUrl, sortOrder: draft.sortOrder };
      if (draft.id) await api(`/admin/categories/${draft.id}`, { method: 'PUT', body });
      else await api('/admin/categories', { body });
      toast('Categoria salva!');
      setDraft(EMPTY);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Category) {
    if (!window.confirm(`Excluir a categoria “${c.name}”?`)) return;
    try {
      await api(`/admin/categories/${c.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  return (
    <>
      <AdminPageHeader title="Categorias" subtitle="Organize o cardápio. A ordem define a exibição no site." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card overflow-x-auto">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Produtos</th>
                <th>Ordem</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((c, i) => (
                <tr key={c.id}>
                  <td>
                    <span className="flex items-center gap-3">
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-blush-100">
                        <SafeImage src={c.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                      </span>
                      <span className="font-medium text-cocoa-800">{c.name}</span>
                    </span>
                  </td>
                  <td>{c.productCount}</td>
                  <td>{i + 1}</td>
                  <td className="whitespace-nowrap text-right">
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => setDraft({ id: c.id, name: c.name, description: c.description ?? '', imageUrl: c.imageUrl ?? '', sortOrder: i })}
                    >
                      Editar
                    </button>
                    <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => remove(c)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={save} className="card h-fit space-y-4 p-6">
          <h2 className="heading-md text-xl">{draft.id ? 'Editar categoria' : 'Nova categoria'}</h2>
          <Field label="Nome" htmlFor="c-name">
            <input id="c-name" required className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Descrição" htmlFor="c-desc">
            <textarea id="c-desc" rows={3} className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </Field>
          <Field label="Ordem de exibição" htmlFor="c-order">
            <input id="c-order" type="number" min={0} className="input" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} />
          </Field>
          <div className="space-y-2">
            <span className="label">Imagem</span>
            {draft.imageUrl && (
              <span className="relative block h-24 w-24 overflow-hidden rounded-full bg-blush-100">
                <SafeImage src={draft.imageUrl} alt="" fill sizes="96px" className="object-cover" />
              </span>
            )}
            <ImageUploader onUploaded={(url) => setDraft((d) => ({ ...d, imageUrl: url }))} />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={saving}>
              {saving && <Spinner />} Salvar
            </button>
            {draft.id && (
              <button type="button" className="btn-ghost" onClick={() => setDraft(EMPTY)}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
