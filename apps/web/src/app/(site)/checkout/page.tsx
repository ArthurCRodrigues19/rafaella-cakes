'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { WEEKDAYS, formatBRL, formatDateLong, formatPhone, weekdayOf } from '@/lib/format';
import type { Address, AddressInput, CartQuote, FulfillmentType, PaymentMethod } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { AddressForm, EMPTY_ADDRESS } from '@/components/checkout/AddressForm';
import { SafeImage } from '@/components/SafeImage';
import { Alert, EmptyState, Field, Spinner } from '@/components/ui';
import { StoreIcon, TruckIcon } from '@/components/icons';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, hydrated, clear } = useCart();

  const [fulfillment, setFulfillment] = useState<FulfillmentType>('PICKUP');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string>('new');
  const [newAddress, setNewAddress] = useState<AddressInput>(EMPTY_ADDRESS);
  const [saveAddress, setSaveAddress] = useState(true);
  const [date, setDate] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('PIX');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Exige login
  useEffect(() => {
    if (!authLoading && !user) router.replace('/entrar?next=/checkout');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    setPhone(user.phone ? formatPhone(user.phone) : '');
    setNewAddress((a) => ({ ...a, recipient: a.recipient || user.name }));
    api<Address[]>('/me/addresses')
      .then((list) => {
        setAddresses(list);
        if (list.length) setAddressId((list.find((a) => a.isDefault) ?? list[0]).id);
      })
      .catch(() => {});
  }, [user]);

  const selectedZip =
    fulfillment === 'DELIVERY'
      ? addressId === 'new'
        ? newAddress.zipCode
        : addresses.find((a) => a.id === addressId)?.zipCode ?? ''
      : '';
  const selectedNeighborhood =
    addressId === 'new' ? newAddress.neighborhood : addresses.find((a) => a.id === addressId)?.neighborhood ?? '';

  const itemsKey = items.map((i) => `${i.variantId}:${i.quantity}`).join('|');

  // Recalcula totais, frete e prazo no servidor
  useEffect(() => {
    if (!hydrated || !items.length) return;
    const ctrl = new AbortController();
    const zip = selectedZip.replace(/\D/g, '');
    api<CartQuote>('/cart/quote', {
      body: {
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        fulfillmentType: fulfillment,
        zipCode: zip.length === 8 ? zip : undefined,
        neighborhood: selectedNeighborhood || undefined,
      },
      signal: ctrl.signal,
    })
      .then((q) => {
        setQuote(q);
        setDate((d) => (d && d >= q.earliestDate ? d : q.earliestDate));
        if (!q.pickupEnabled && fulfillment === 'PICKUP') setFulfillment('DELIVERY');
        if (!q.deliveryEnabled && fulfillment === 'DELIVERY') setFulfillment('PICKUP');
      })
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, hydrated, fulfillment, selectedZip, selectedNeighborhood]);

  const dateError = useMemo(() => {
    if (!quote || !date) return '';
    if (date < quote.earliestDate) return `A data mais próxima é ${formatDateLong(quote.earliestDate)}.`;
    if (quote.openWeekdays.length && !quote.openWeekdays.includes(weekdayOf(date))) {
      return `Atendemos apenas: ${quote.openWeekdays.map((d) => WEEKDAYS[d]).join(', ')}.`;
    }
    return '';
  }, [date, quote]);

  const deliveryBlocked = fulfillment === 'DELIVERY' && quote?.shipping && !quote.shipping.deliverable;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (dateError) return;
    setSubmitting(true);
    setErrors({});
    setError('');
    try {
      const body = {
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        fulfillmentType: fulfillment,
        paymentMethod: payment,
        scheduledDate: date,
        phone: phone || undefined,
        notes: notes || undefined,
        ...(fulfillment === 'DELIVERY'
          ? addressId === 'new'
            ? { address: newAddress, saveAddress }
            : { addressId }
          : {}),
      };
      const { id } = await api<{ id: string }>('/orders', { body });
      clear();
      router.push(`/conta/pedidos/${id}?novo=1`);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  if (authLoading || !user || !hydrated) {
    return (
      <div className="container-page py-14">
        <div className="skeleton h-96" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="container-page py-14">
        <EmptyState title="Seu carrinho está vazio" action={<Link href="/produtos" className="btn-primary">Ver o cardápio</Link>} />
      </div>
    );
  }

  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="heading-lg mb-8">Finalizar pedido</h1>

      <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          {/* 1. Entrega ou retirada */}
          <section className="card p-6 sm:p-8" aria-labelledby="step-1">
            <h2 id="step-1" className="heading-md mb-5 text-xl">
              1. Como você quer receber?
            </h2>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
              {(
                [
                  { value: 'PICKUP', label: 'Retirar na loja', desc: 'Grátis · no nosso ateliê', icon: StoreIcon, enabled: quote?.pickupEnabled ?? true },
                  { value: 'DELIVERY', label: 'Receber em casa', desc: 'Frete calculado pelo CEP', icon: TruckIcon, enabled: quote?.deliveryEnabled ?? true },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-champagne-400 ${
                    fulfillment === opt.value ? 'border-cocoa-600 bg-blush-50' : 'border-cocoa-200 hover:border-cocoa-400'
                  } ${!opt.enabled ? 'pointer-events-none opacity-40' : ''}`}
                >
                  <input type="radio" name="fulfillment" className="sr-only" value={opt.value} checked={fulfillment === opt.value} onChange={() => setFulfillment(opt.value)} disabled={!opt.enabled} />
                  <opt.icon className="text-blush-600" width={26} height={26} />
                  <span>
                    <span className="block font-medium text-cocoa-800">{opt.label}</span>
                    <span className="text-xs text-cocoa-400">{opt.enabled ? opt.desc : 'Indisponível no momento'}</span>
                  </span>
                </label>
              ))}
            </div>

            {fulfillment === 'DELIVERY' && (
              <div className="mt-6 space-y-4">
                {addresses.length > 0 && (
                  <div className="space-y-2">
                    {addresses.map((a) => (
                      <label key={a.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 text-sm ${addressId === a.id ? 'border-cocoa-600 bg-blush-50' : 'border-cocoa-200'}`}>
                        <input type="radio" name="address" className="mt-1 accent-cocoa-700" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                        <span>
                          <span className="font-medium text-cocoa-800">{a.label}</span> — {a.street}, {a.number}
                          {a.complement ? ` (${a.complement})` : ''} · {a.neighborhood}, {a.city}/{a.state}
                        </span>
                      </label>
                    ))}
                    <label className={`flex cursor-pointer gap-3 rounded-2xl border p-4 text-sm ${addressId === 'new' ? 'border-cocoa-600 bg-blush-50' : 'border-cocoa-200'}`}>
                      <input type="radio" name="address" className="accent-cocoa-700" checked={addressId === 'new'} onChange={() => setAddressId('new')} />
                      Usar um novo endereço
                    </label>
                  </div>
                )}
                {addressId === 'new' && (
                  <>
                    <AddressForm value={newAddress} onChange={setNewAddress} errors={errors} idPrefix="checkout" />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                      Salvar este endereço na minha conta
                    </label>
                  </>
                )}
                {deliveryBlocked && (
                  <Alert tone="warning">Ainda não entregamos neste endereço. Escolha outro ou a retirada na loja.</Alert>
                )}
              </div>
            )}
          </section>

          {/* 2. Data */}
          <section className="card p-6 sm:p-8" aria-labelledby="step-2">
            <h2 id="step-2" className="heading-md mb-2 text-xl">
              2. Para quando?
            </h2>
            <p className="mb-5 text-sm text-cocoa-500">
              Tudo é feito sob encomenda. Prazo mínimo deste pedido: <strong>{quote?.leadDays ?? '…'} dia(s)</strong>
              {quote?.openWeekdays.length ? <> · atendemos {quote.openWeekdays.map((d) => WEEKDAYS[d]).join(', ')}</> : null}.
            </p>
            <Field label="Data de entrega/retirada" htmlFor="date" error={dateError || errors.scheduledDate}>
              <input id="date" type="date" required className={`input max-w-xs ${dateError ? 'input-error' : ''}`} min={quote?.earliestDate} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            {date && !dateError && <p className="mt-2 text-sm capitalize text-emerald-700">{formatDateLong(date)}</p>}
          </section>

          {/* 3. Pagamento e contato */}
          <section className="card p-6 sm:p-8" aria-labelledby="step-3">
            <h2 id="step-3" className="heading-md mb-5 text-xl">
              3. Pagamento
            </h2>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
              {(
                [
                  { value: 'PIX', label: 'Pix', desc: 'Aprovação na hora' },
                  { value: 'CARD', label: 'Cartão de crédito', desc: 'Em até 12x' },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer flex-col rounded-2xl border p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-champagne-400 ${
                    payment === opt.value ? 'border-cocoa-600 bg-blush-50' : 'border-cocoa-200 hover:border-cocoa-400'
                  }`}
                >
                  <input type="radio" name="payment" className="sr-only" value={opt.value} checked={payment === opt.value} onChange={() => setPayment(opt.value)} />
                  <span className="font-medium text-cocoa-800">{opt.label}</span>
                  <span className="text-xs text-cocoa-400">{opt.desc}</span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-cocoa-400">O pagamento é feito na próxima tela, de forma segura, pelo Mercado Pago.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Celular / WhatsApp" htmlFor="phone" hint="Para avisarmos sobre o pedido.">
                <input id="phone" type="tel" inputMode="tel" className="input" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(11) 90000-0000" />
              </Field>
              <Field label="Observações (opcional)" htmlFor="notes" className="sm:col-span-2">
                <textarea id="notes" rows={3} maxLength={1000} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mensagem no bolo, preferência de sabores, horário..." />
              </Field>
            </div>
          </section>
        </div>

        {/* Resumo */}
        <aside className="card h-fit space-y-5 p-6 lg:sticky lg:top-32" aria-label="Resumo do pedido">
          <h2 className="heading-md text-xl">Resumo</h2>
          <ul className="space-y-3">
            {(quote?.lines ?? []).map((l) => (
              <li key={l.variantId} className="flex gap-3 text-sm">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-blush-100">
                  <SafeImage src={l.imageUrl} alt={l.imageAlt ?? l.productName} fill sizes="56px" className="object-cover" />
                </span>
                <span className="flex-1">
                  <span className="block text-cocoa-800">
                    {l.quantity}× {l.productName}
                  </span>
                  <span className="text-xs text-cocoa-400">{l.variantName}</span>
                </span>
                <span className="font-medium">{formatBRL(l.totalCents)}</span>
              </li>
            ))}
          </ul>
          {quote?.problems.map((p) => (
            <Alert key={p.variantId} tone="warning">
              {p.message}
            </Alert>
          ))}
          <dl className="space-y-2 border-t border-blush-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{quote ? formatBRL(quote.subtotalCents) : <Spinner />}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{fulfillment === 'PICKUP' ? 'Retirada' : 'Entrega'}</dt>
              <dd>
                {fulfillment === 'PICKUP'
                  ? 'Grátis'
                  : quote?.shipping?.deliverable
                    ? formatBRL(quote.shippingCents)
                    : 'informe o CEP'}
              </dd>
            </div>
            <div className="flex justify-between border-t border-blush-100 pt-3 font-serif text-xl text-cocoa-800">
              <dt>Total</dt>
              <dd>{quote ? formatBRL(quote.totalCents) : '—'}</dd>
            </div>
          </dl>
          {error && <Alert tone="error">{error}</Alert>}
          <button
            className="btn-primary w-full py-4"
            disabled={submitting || !quote || !!dateError || Boolean(deliveryBlocked) || (quote?.problems.length ?? 0) > 0}
          >
            {submitting && <Spinner />} Confirmar e ir para o pagamento
          </button>
          <p className="text-center text-xs text-cocoa-400">Você poderá acompanhar o pedido pela sua conta.</p>
        </aside>
      </form>
    </div>
  );
}
