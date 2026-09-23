'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ProductDetail } from '@/lib/types';
import { formatBRL } from '@/lib/format';
import { useCart } from '../providers/CartProvider';
import { useToast } from '../providers/ToastProvider';
import { BagIcon, MinusIcon, PlusIcon } from '../icons';

/** Seleção de variação (tamanho/sabor) + quantidade + botão de adicionar ao carrinho. */
export function AddToCart({ product }: { product: ProductDetail }) {
  const { add } = useCart();
  const toast = useToast();
  const firstAvailable = product.variants.find((v) => v.available) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId);
  if (!variant) return <p className="text-cocoa-500">Produto indisponível no momento.</p>;

  const maxQty = variant.stock ?? 50;

  function onAdd() {
    if (!variant || !variant.available) return;
    add(
      {
        variantId: variant.id,
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        variantName: variant.name,
        unitPriceCents: variant.priceCents,
        imageUrl: product.images[0]?.url ?? null,
        imageAlt: product.images[0]?.alt ?? null,
      },
      qty,
    );
    setAdded(true);
    toast(`${product.name} foi para o carrinho 🛍️`);
  }

  return (
    <div className="space-y-6">
      <p className="font-serif text-3xl text-cocoa-800" aria-live="polite">
        {formatBRL(variant.priceCents * qty)}
        {qty > 1 && <span className="ml-2 font-sans text-sm text-cocoa-400">({formatBRL(variant.priceCents)} cada)</span>}
      </p>

      {product.variants.length > 1 && (
        <fieldset>
          <legend className="label">Escolha o tamanho / opção</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {product.variants.map((v) => (
              <label
                key={v.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-champagne-400 ${
                  v.id === variantId ? 'border-cocoa-600 bg-white shadow-card' : 'border-cocoa-200 bg-white/60 hover:border-cocoa-400'
                } ${!v.available ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name="variant"
                  value={v.id}
                  checked={v.id === variantId}
                  disabled={!v.available}
                  onChange={() => {
                    setVariantId(v.id);
                    setQty(1);
                    setAdded(false);
                  }}
                  className="sr-only"
                />
                <span>
                  <span className="block font-medium text-cocoa-800">{v.name}</span>
                  {v.flavor && <span className="text-xs text-cocoa-400">{v.flavor}</span>}
                  {!v.available && <span className="text-xs text-red-700"> · esgotado</span>}
                </span>
                <span className="whitespace-nowrap font-semibold text-cocoa-700">{formatBRL(v.priceCents)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {variant.stock !== null && variant.available && variant.stock <= 5 && (
        <p className="text-sm text-blush-700">Restam apenas {variant.stock} unidade(s)!</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-full border border-cocoa-200 bg-white" role="group" aria-label="Quantidade">
          <button type="button" className="p-3 text-cocoa-500 hover:text-cocoa-800 disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Diminuir quantidade">
            <MinusIcon width={16} />
          </button>
          <span className="w-8 text-center text-sm font-semibold" aria-live="polite">
            {qty}
          </span>
          <button type="button" className="p-3 text-cocoa-500 hover:text-cocoa-800 disabled:opacity-40" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label="Aumentar quantidade">
            <PlusIcon width={16} />
          </button>
        </div>
        <button type="button" className="btn-primary flex-1 py-3.5" onClick={onAdd} disabled={!variant.available}>
          <BagIcon width={18} /> {variant.available ? 'Adicionar ao carrinho' : 'Esgotado'}
        </button>
      </div>

      {added && (
        <p className="text-sm text-cocoa-500">
          Tudo certo!{' '}
          <Link href="/carrinho" className="link font-medium">
            Ir para o carrinho →
          </Link>
        </p>
      )}
    </div>
  );
}
