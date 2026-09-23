'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { GalleryImage } from '@/lib/types';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { useToast } from '@/components/providers/ToastProvider';
import { SafeImage } from '@/components/SafeImage';
import { EmptyState } from '@/components/ui';

export default function AdminGalleryPage() {
  const toast = useToast();
  const [list, setList] = useState<GalleryImage[] | null>(null);

  const load = useCallback(() => {
    api<GalleryImage[]>('/gallery').then(setList).catch(() => setList([]));
  }, []);
  useEffect(load, [load]);

  async function add(url: string) {
    try {
      await api('/admin/gallery', { body: { url, alt: 'Doce da Rafaella Cakes', sortOrder: list?.length ?? 0 } });
      toast('Foto adicionada! Não esqueça de descrevê-la.');
      load();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  async function save(img: GalleryImage) {
    try {
      await api(`/admin/gallery/${img.id}`, { method: 'PUT', body: { url: img.url, alt: img.alt, caption: img.caption ?? '', sortOrder: img.sortOrder } });
      toast('Foto atualizada.');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  async function remove(img: GalleryImage) {
    if (!window.confirm('Remover esta foto da galeria?')) return;
    await api(`/admin/gallery/${img.id}`, { method: 'DELETE' }).catch(() => {});
    load();
  }

  const patch = (id: string, data: Partial<GalleryImage>) => setList((l) => l?.map((x) => (x.id === id ? { ...x, ...data } : x)) ?? null);

  return (
    <>
      <AdminPageHeader title="Galeria" subtitle="Fotos exibidas na página Galeria do site." actions={<ImageUploader onUploaded={add} label="Adicionar foto" />} />
      {!list ? (
        <div className="skeleton h-64" />
      ) : list.length === 0 ? (
        <EmptyState title="A galeria está vazia" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((img) => (
            <li key={img.id} className="card overflow-hidden">
              <div className="relative aspect-[4/3] bg-blush-100">
                <SafeImage src={img.url} alt={img.alt} fill sizes="400px" className="object-cover" />
              </div>
              <div className="space-y-2 p-4">
                <label className="label text-xs" htmlFor={`alt-${img.id}`}>
                  Descrição (texto alternativo)
                </label>
                <input id={`alt-${img.id}`} className="input py-2" value={img.alt} onChange={(e) => patch(img.id, { alt: e.target.value })} />
                <label className="label text-xs" htmlFor={`cap-${img.id}`}>
                  Legenda (opcional)
                </label>
                <input id={`cap-${img.id}`} className="input py-2" value={img.caption ?? ''} onChange={(e) => patch(img.id, { caption: e.target.value })} />
                <div className="flex items-center gap-2 pt-2">
                  <label className="text-xs text-cocoa-400" htmlFor={`ord-${img.id}`}>
                    Ordem
                  </label>
                  <input id={`ord-${img.id}`} type="number" min={0} className="input w-20 py-1.5" value={img.sortOrder} onChange={(e) => patch(img.id, { sortOrder: Number(e.target.value) })} />
                  <button type="button" className="btn-primary btn-sm ml-auto" onClick={() => save(img)}>
                    Salvar
                  </button>
                  <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => remove(img)}>
                    Excluir
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
