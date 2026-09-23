'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { centsToInput, parseBRL } from '@/lib/format';
import type { Category } from '@/lib/types';
import { useToast } from '../providers/ToastProvider';
import { SafeImage } from '../SafeImage';
import { Alert, Field, Spinner } from '../ui';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, TrashIcon } from '../icons';
import { ImageUploader } from './ImageUploader';

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  shortDescription: string | null;
  description: string;
  isActive: boolean;
  isFeatured: boolean;
  leadTimeDays: number | null;
  images: { url: string; alt: string }[];
  variants: {
    id: string;
    name: string;
    size: string | null;
    flavor: string | null;
    priceCents: number;
    stock: number | null;
    isActive: boolean;
  }[];
}

interface VariantRow {
  key: string;
  id?: string;
  name: string;
  size: string;
  flavor: string;
  price: string; // "120,00"
  stock: string; // "" = sob demanda
  isActive: boolean;
}

const newRow = (): VariantRow => ({
  key: Math.random().toString(36).slice(2),
  name: '',
  size: '',
  flavor: '',
  price: '',
  stock: '',
  isActive: true,
});

const toRows = (list: AdminProduct['variants']): VariantRow[] =>
  list.map((v) => ({
    key: v.id,
    id: v.id,
    name: v.name,
    size: v.size ?? '',
    flavor: v.flavor ?? '',
    price: centsToInput(v.priceCents),
    stock: v.stock === null ? '' : String(v.stock),
    isActive: v.isActive,
  }));

/** Formulário completo de produto: dados, fotos (upload/URL) e variações de tamanho/sabor. */
export function ProductForm({ product }: { product?: AdminProduct }) {
  const router = useRouter();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState(product?.name ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [shortDescription, setShort] = useState(product?.shortDescription ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [isActive, setActive] = useState(product?.isActive ?? true);
  const [isFeatured, setFeatured] = useState(product?.isFeatured ?? false);
  const [leadTimeDays, setLead] = useState(product?.leadTimeDays?.toString() ?? '');
  const [images, setImages] = useState(product?.images ?? []);
  const [imageUrl, setImageUrl] = useState('');
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.length ? toRows(product.variants) : [{ ...newRow(), name: 'Único' }],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Category[]>('/categories').then(setCategories).catch(() => {});
  }, []);

  const updateVariant = (key: string, patch: Partial<VariantRow>) =>
    setVariants((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const moveImage = (index: number, dir: -1 | 1) =>
    setImages((list) => {
      const next = [...list];
      const target = index + dir;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  function addImage(url: string) {
    setImages((list) => [...list, { url, alt: name || 'Foto do produto' }]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setError('');
    const body = {
      name,
      categoryId,
      shortDescription,
      description,
      isActive,
      isFeatured,
      leadTimeDays: leadTimeDays === '' ? null : Number(leadTimeDays),
      images,
      variants: variants.map((v) => ({
        id: v.id,
        name: v.name,
        size: v.size,
        flavor: v.flavor,
        priceCents: parseBRL(v.price),
        stock: v.stock === '' ? null : Number(v.stock),
        isActive: v.isActive,
      })),
    };
    try {
      if (product) {
        const updated = await api<AdminProduct>(`/admin/products/${product.id}`, { method: 'PUT', body });
        // Sincroniza os ids das novas variações (evita duplicá-las no próximo salvamento)
        setVariants(toRows(updated.variants));
        setImages(updated.images.map((i) => ({ url: i.url, alt: i.alt })));
        toast('Produto atualizado!');
      } else {
        const created = await api<{ id: string }>('/admin/products', { body });
        toast('Produto criado! 🎂');
        router.replace(`/admin/produtos/${created.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!product || !window.confirm(`Excluir “${product.name}” definitivamente? Pedidos antigos continuam registrados.`)) return;
    try {
      await api(`/admin/products/${product.id}`, { method: 'DELETE' });
      toast('Produto excluído.', 'info');
      router.replace('/admin/produtos');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="card space-y-4 p-6">
          <h2 className="heading-md text-xl">Informações</h2>
          <Field label="Nome do produto" htmlFor="name" error={errors.name}>
            <input id="name" required className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Resumo (aparece nos cards)" htmlFor="short" error={errors.shortDescription}>
            <input id="short" maxLength={200} className="input" value={shortDescription} onChange={(e) => setShort(e.target.value)} />
          </Field>
          <Field label="Descrição completa" htmlFor="description" error={errors.description} hint="Ingredientes, conservação, dicas... Deixe uma linha em branco entre parágrafos.">
            <textarea id="description" rows={7} className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </section>

        <section className="card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="heading-md text-xl">Tamanhos, sabores e preços</h2>
            <button type="button" className="btn-outline btn-sm" onClick={() => setVariants((v) => [...v, newRow()])}>
              <PlusIcon width={14} /> Adicionar variação
            </button>
          </div>
          {errors.variants && <p className="field-error">{errors.variants}</p>}
          <p className="text-xs text-cocoa-400">Deixe o estoque em branco para itens feitos sob encomenda (sem limite).</p>
          <div className="space-y-3">
            {variants.map((v, i) => (
              <fieldset key={v.key} className={`rounded-2xl border p-4 ${v.isActive ? 'border-blush-100' : 'border-dashed border-cocoa-200 opacity-70'}`}>
                <legend className="sr-only">Variação {i + 1}</legend>
                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-4">
                    <label className="label text-xs" htmlFor={`v-name-${v.key}`}>Nome exibido</label>
                    <input id={`v-name-${v.key}`} required className="input py-2" value={v.name} onChange={(e) => updateVariant(v.key, { name: e.target.value })} placeholder="Médio · 20 fatias" />
                    {errors[`variants.${i}.name`] && <p className="field-error">{errors[`variants.${i}.name`]}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-xs" htmlFor={`v-size-${v.key}`}>Tamanho</label>
                    <input id={`v-size-${v.key}`} className="input py-2" value={v.size} onChange={(e) => updateVariant(v.key, { size: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-xs" htmlFor={`v-flavor-${v.key}`}>Sabor</label>
                    <input id={`v-flavor-${v.key}`} className="input py-2" value={v.flavor} onChange={(e) => updateVariant(v.key, { flavor: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-xs" htmlFor={`v-price-${v.key}`}>Preço (R$)</label>
                    <input id={`v-price-${v.key}`} required inputMode="decimal" className="input py-2" value={v.price} onChange={(e) => updateVariant(v.key, { price: e.target.value })} placeholder="0,00" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-xs" htmlFor={`v-stock-${v.key}`}>Estoque</label>
                    <input id={`v-stock-${v.key}`} type="number" min={0} className="input py-2" value={v.stock} onChange={(e) => updateVariant(v.key, { stock: e.target.value })} placeholder="∞" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="checkbox" checked={v.isActive} onChange={(e) => updateVariant(v.key, { isActive: e.target.checked })} />
                    Disponível para venda
                  </label>
                  {variants.length > 1 && (
                    <button type="button" className="inline-flex items-center gap-1 text-cocoa-400 hover:text-red-700" onClick={() => setVariants((rows) => rows.filter((r) => r.key !== v.key))}>
                      <TrashIcon width={14} /> Remover
                    </button>
                  )}
                </div>
              </fieldset>
            ))}
          </div>
        </section>

        <section className="card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="heading-md text-xl">Fotos</h2>
            <ImageUploader onUploaded={addImage} />
          </div>
          <p className="text-xs text-cocoa-400">A primeira foto é a capa. Descreva cada foto (texto alternativo) — ajuda na acessibilidade e no Google.</p>
          {images.length === 0 && <p className="rounded-2xl bg-blush-50 p-4 text-sm text-cocoa-500">Nenhuma foto ainda. Sem foto, o site mostra uma ilustração padrão.</p>}
          <ul className="space-y-3">
            {images.map((img, i) => (
              <li key={`${img.url}-${i}`} className="flex items-center gap-3 rounded-2xl border border-blush-100 p-3">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-blush-100">
                  <SafeImage src={img.url} alt={img.alt} fill sizes="64px" className="object-cover" />
                </span>
                <div className="flex-1">
                  <label className="sr-only" htmlFor={`alt-${i}`}>Descrição da foto {i + 1}</label>
                  <input
                    id={`alt-${i}`}
                    className="input py-2"
                    value={img.alt}
                    onChange={(e) => setImages((list) => list.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                    placeholder="Descreva a foto"
                  />
                  {i === 0 && <span className="text-xs text-champagne-600">Capa</span>}
                </div>
                <div className="flex gap-1">
                  <button type="button" className="btn-ghost px-2" onClick={() => moveImage(i, -1)} aria-label="Mover para cima" disabled={i === 0}>
                    <ChevronLeftIcon width={16} className="rotate-90" />
                  </button>
                  <button type="button" className="btn-ghost px-2" onClick={() => moveImage(i, 1)} aria-label="Mover para baixo" disabled={i === images.length - 1}>
                    <ChevronRightIcon width={16} className="rotate-90" />
                  </button>
                  <button type="button" className="btn-ghost px-2 text-red-700" onClick={() => setImages((list) => list.filter((_, j) => j !== i))} aria-label="Remover foto">
                    <TrashIcon width={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <label htmlFor="image-url" className="sr-only">
              URL de imagem
            </label>
            <input id="image-url" className="input py-2" placeholder="…ou cole a URL de uma imagem (https://)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            <button
              type="button"
              className="btn-outline btn-sm shrink-0"
              onClick={() => {
                if (!imageUrl.startsWith('https://')) return toast('Use uma URL começando com https://', 'error');
                addImage(imageUrl);
                setImageUrl('');
              }}
            >
              Adicionar
            </button>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="card space-y-4 p-6 xl:sticky xl:top-8">
          <h2 className="heading-md text-xl">Publicação</h2>
          <Field label="Categoria" htmlFor="category" error={errors.categoryId}>
            <select id="category" required className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Selecione</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prazo mínimo (dias)" htmlFor="lead" hint="Em branco = prazo padrão da loja." error={errors.leadTimeDays}>
            <input id="lead" type="number" min={0} max={60} className="input" value={leadTimeDays} onChange={(e) => setLead(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="checkbox" checked={isActive} onChange={(e) => setActive(e.target.checked)} />
            Visível na loja
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="checkbox" checked={isFeatured} onChange={(e) => setFeatured(e.target.checked)} />
            Destacar na home (“Favoritos da casa”)
          </label>
          {error && <Alert tone="error">{error}</Alert>}
          <button className="btn-primary w-full" disabled={saving}>
            {saving && <Spinner />} {product ? 'Salvar alterações' : 'Criar produto'}
          </button>
          {product && (
            <>
              <Link href={`/produtos/${product.slug}`} target="_blank" className="btn-ghost w-full">
                Ver na loja ↗
              </Link>
              <button type="button" className="btn-danger w-full" onClick={onDelete}>
                Excluir produto
              </button>
            </>
          )}
        </section>
      </aside>
    </form>
  );
}
