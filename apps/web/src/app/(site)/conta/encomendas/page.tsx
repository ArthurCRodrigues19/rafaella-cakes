'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { formatBRL, formatDate } from '@/lib/format';
import type { Address, CustomOrder } from '@/lib/types';
import { useToast } from '@/components/providers/ToastProvider';
import { SafeImage } from '@/components/SafeImage';
import { CustomStatusBadge, EmptyState, Spinner } from '@/components/ui';

export default function MyCustomOrdersPage() {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState<CustomOrder[] | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressFor, setAddressFor] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api<CustomOrder[]>('/me/custom-orders').then(setList).catch(() => setList([]));
  }, []);

  useEffect(() => {
    load();
    api<Address[]>('/me/addresses').then(setAddresses).catch(() => {});
  }, [load]);

  async function accept(c: CustomOrder) {
    setBusy(c.id);
    try {
      const addressId = c.fulfillmentType === 'DELIVERY' ? addressFor[c.id] ?? addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id : undefined;
      const { orderId } = await api<{ orderId: string }>(`/me/custom-orders/${c.id}/accept`, { body: { addressId } });
      router.push(`/conta/pedidos/${orderId}?novo=1`);
    } catch (err) {
      toast(errorMessage(err), 'error');
      setBusy(null);
    }
  }

  async function decline(c: CustomOrder) {
    if (!window.confirm('Tem certeza que deseja cancelar esta solicitação?')) return;
    setBusy(c.id);
    try {
      await api(`/me/custom-orders/${c.id}/decline`, { method: 'POST' });
      toast('Solicitação cancelada.', 'info');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  if (!list) return <div className="skeleton h-64" />;
  if (!list.length) {
    return (
      <EmptyState title="Nenhuma encomenda por aqui" action={<Link href="/encomendas" className="btn-primary">Solicitar orçamento</Link>}>
        Tem uma festa chegando? Conte pra gente como você imagina o bolo ou os doces.
      </EmptyState>
    );
  }

  return (
    <ul className="space-y-5">
      {list.map((c) => (
        <li key={c.id} className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-serif text-lg text-cocoa-800">
                {c.eventType} · {formatDate(c.eventDate)}
              </p>
              <p className="text-xs text-cocoa-400">
                Encomenda {c.number} · {c.guests} pessoas · {c.fulfillmentType === 'PICKUP' ? 'retirada' : 'entrega'}
              </p>
            </div>
            <CustomStatusBadge status={c.status} />
          </div>

          <div className="mt-4 flex gap-4">
            {c.referenceImageUrl && (
              <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-blush-100">
                <SafeImage src={c.referenceImageUrl} alt="Imagem de referência enviada" fill sizes="80px" className="object-cover" />
              </span>
            )}
            <dl className="grid flex-1 gap-x-6 gap-y-1 text-sm text-cocoa-600 sm:grid-cols-2">
              <div><dt className="inline text-cocoa-400">Sabor: </dt><dd className="inline">{c.flavor}</dd></div>
              {c.filling && <div><dt className="inline text-cocoa-400">Recheio: </dt><dd className="inline">{c.filling}</dd></div>}
              {c.frosting && <div><dt className="inline text-cocoa-400">Cobertura: </dt><dd className="inline">{c.frosting}</dd></div>}
              {c.size && <div><dt className="inline text-cocoa-400">Tamanho: </dt><dd className="inline">{c.size}</dd></div>}
            </dl>
          </div>

          {c.status === 'QUOTED' && c.quotedPriceCents !== null && (
            <div className="mt-5 rounded-2xl bg-blush-50 p-5">
              <p className="text-sm text-cocoa-500">Orçamento da Rafaella</p>
              <p className="font-serif text-3xl text-cocoa-800">{formatBRL(c.quotedPriceCents)}</p>
              {c.quoteMessage && <p className="mt-2 whitespace-pre-line text-sm italic text-cocoa-600">“{c.quoteMessage}”</p>}

              {c.fulfillmentType === 'DELIVERY' && !c.order && (
                <div className="mt-4">
                  {addresses.length ? (
                    <>
                      <label htmlFor={`addr-${c.id}`} className="label">
                        Endereço de entrega
                      </label>
                      <select
                        id={`addr-${c.id}`}
                        className="input"
                        value={addressFor[c.id] ?? addresses.find((a) => a.isDefault)?.id ?? addresses[0].id}
                        onChange={(e) => setAddressFor({ ...addressFor, [c.id]: e.target.value })}
                      >
                        {addresses.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label} — {a.street}, {a.number} · {a.neighborhood}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <p className="text-sm text-cocoa-500">
                      <Link href="/conta/enderecos" className="link">
                        Cadastre um endereço
                      </Link>{' '}
                      para aprovar a entrega.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                {c.order ? (
                  <Link href={`/conta/pedidos/${c.order.id}`} className="btn-primary">
                    Ir para o pagamento
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => accept(c)}
                    disabled={busy === c.id || (c.fulfillmentType === 'DELIVERY' && !addresses.length)}
                  >
                    {busy === c.id && <Spinner />} Aprovar e pagar
                  </button>
                )}
                <button type="button" className="btn-ghost" onClick={() => decline(c)} disabled={busy === c.id}>
                  Cancelar solicitação
                </button>
              </div>
            </div>
          )}

          {c.status === 'REQUESTED' && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-cocoa-500">
              <p>A Rafaella está preparando seu orçamento. Você receberá um e-mail assim que estiver pronto.</p>
              <button type="button" className="btn-ghost btn-sm" onClick={() => decline(c)} disabled={busy === c.id}>
                Cancelar
              </button>
            </div>
          )}

          {c.order && c.status !== 'QUOTED' && (
            <Link href={`/conta/pedidos/${c.order.id}`} className="link mt-4 inline-block text-sm">
              Ver pedido e pagamento →
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
