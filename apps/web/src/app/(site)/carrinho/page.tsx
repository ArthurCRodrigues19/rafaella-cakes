'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatBRL, formatCep, formatDateLong } from '@/lib/format';
import type { CartQuote, ShippingQuote } from '@/lib/types';
import { useCart } from '@/components/providers/CartProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { SafeImage } from '@/components/SafeImage';
import { Alert, EmptyState, Spinner } from '@/components/ui';
import { MinusIcon, PlusIcon, TrashIcon } from '@/components/icons';

export default function CartPage() {
  const { items, hydrated, setQuantity, remove, reconcile } = useCart();
  const { user } = useAuth();
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [cep, setCep] = useState('');
  const [shipping, setShipping] = useState<ShippingQuote | null>(null);
  const [cepLoading, setCepLoading] = useState(false);

  const key = items.map((i) => `${i.variantId}:${i.quantity}`).join('|');

  // Preços, estoque e prazo SEMPRE conferidos no servidor
  useEffect(() => {
    if (!hydrated || !items.length) {
      setQuote(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    api<CartQuote>('/cart/quote', {
      body: { items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })) },
      signal: ctrl.signal,
    })
      .then((q) => {
        setQuote(q);
        reconcile(q.lines);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hydrated]);

  async function calcShipping(e: React.FormEvent) {
    e.preventDefault();
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      setShipping(await api<ShippingQuote>(`/shipping/quote?cep=${digits}`));
    } catch {
      setShipping(null);
    } finally {
      setCepLoading(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="container-page py-14">
        <div className="skeleton h-64" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="container-page py-14">
        <EmptyState
          title="Seu carrinho está vazio"
          action={
            <Link href="/produtos" className="btn-primary">
              Explorar o cardápio
            </Link>
          }
        >
          Que tal escolher um docinho? Temos bolos, tortas, brigadeiros e muito mais.
        </EmptyState>
      </div>
    );
  }

  const subtotal = quote?.subtotalCents ?? items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
  const problems = quote?.problems ?? [];

  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="heading-lg mb-8">Seu carrinho</h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <section aria-label="Itens do carrinho">
          {problems.length > 0 && (
            <div className="mb-4 space-y-2">
              {problems.map((p) => (
                <Alert key={p.variantId} tone="warning">
                  {p.message}
                </Alert>
              ))}
            </div>
          )}
          <ul className="divide-y divide-blush-100 rounded-3xl bg-white px-4 shadow-card sm:px-6">
            {items.map((item) => (
              <li key={item.variantId} className="flex gap-4 py-5">
                <Link href={`/produtos/${item.productSlug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-blush-100">
                  <SafeImage src={item.imageUrl} alt={item.imageAlt ?? item.productName} fill sizes="96px" className="object-cover" />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div>
                      <Link href={`/produtos/${item.productSlug}`} className="font-serif text-lg text-cocoa-800 hover:text-blush-600">
                        {item.productName}
                      </Link>
                      <p className="text-sm text-cocoa-400">{item.variantName}</p>
                    </div>
                    <p className="whitespace-nowrap font-semibold text-cocoa-800">{formatBRL(item.unitPriceCents * item.quantity)}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center rounded-full border border-cocoa-200" role="group" aria-label={`Quantidade de ${item.productName}`}>
                      <button type="button" className="p-2 text-cocoa-500 hover:text-cocoa-800" onClick={() => setQuantity(item.variantId, item.quantity - 1)} aria-label="Diminuir">
                        <MinusIcon width={14} />
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button type="button" className="p-2 text-cocoa-500 hover:text-cocoa-800" onClick={() => setQuantity(item.variantId, item.quantity + 1)} aria-label="Aumentar">
                        <PlusIcon width={14} />
                      </button>
                    </div>
                    <button type="button" className="inline-flex items-center gap-1 text-sm text-cocoa-400 hover:text-red-700" onClick={() => remove(item.variantId)}>
                      <TrashIcon width={16} /> Remover
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/produtos" className="link mt-6 inline-block text-sm">
            ← Continuar comprando
          </Link>
        </section>

        <aside className="card h-fit space-y-6 p-6 lg:sticky lg:top-32" aria-label="Resumo do pedido">
          <h2 className="heading-md text-xl">Resumo</h2>

          <form onSubmit={calcShipping} className="space-y-2">
            <label htmlFor="cep" className="label">
              Calcular frete
            </label>
            <div className="flex gap-2">
              <input id="cep" inputMode="numeric" className="input py-2.5" placeholder="00000-000" value={formatCep(cep)} onChange={(e) => setCep(e.target.value)} />
              <button className="btn-outline btn-sm shrink-0" disabled={cepLoading}>
                {cepLoading ? <Spinner /> : 'OK'}
              </button>
            </div>
            {shipping && (
              <p className={`text-sm ${shipping.deliverable ? 'text-emerald-700' : 'text-red-700'}`} role="status">
                {shipping.deliverable
                  ? `${shipping.zoneName}: ${shipping.feeCents ? formatBRL(shipping.feeCents) : 'grátis'}`
                  : 'Não entregamos neste CEP. Retirada disponível na loja!'}
              </p>
            )}
            <p className="text-xs text-cocoa-400">Retirada na loja é sempre grátis.</p>
          </form>

          <dl className="space-y-2 border-t border-blush-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="font-medium">{loading ? <Spinner /> : formatBRL(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-cocoa-500">
              <dt>Frete</dt>
              <dd>{shipping?.deliverable ? formatBRL(shipping.feeCents) : 'calculado no checkout'}</dd>
            </div>
            <div className="flex justify-between border-t border-blush-100 pt-3 font-serif text-xl text-cocoa-800">
              <dt>Total</dt>
              <dd>{formatBRL(subtotal + (shipping?.deliverable ? shipping.feeCents : 0))}</dd>
            </div>
          </dl>

          {quote && (
            <p className="rounded-2xl bg-blush-50 p-3 text-sm text-cocoa-600">
              Produção artesanal: a data mais próxima para entrega/retirada é <strong>{formatDateLong(quote.earliestDate)}</strong>.
            </p>
          )}

          <Link
            href={user ? '/checkout' : '/entrar?next=/checkout'}
            className={`btn-primary w-full ${problems.length ? 'pointer-events-none opacity-60' : ''}`}
            aria-disabled={problems.length > 0}
          >
            {user ? 'Finalizar pedido' : 'Entrar e finalizar pedido'}
          </Link>
        </aside>
      </div>
    </div>
  );
}
