'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { CUSTOM_STATUS, ORDER_STATUS, centsToInput, formatDate, formatDateTime, parseBRL, whatsappLink } from '@/lib/format';
import type { CustomOrder, CustomOrderStatus } from '@/lib/types';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { useToast } from '@/components/providers/ToastProvider';
import { SafeImage } from '@/components/SafeImage';
import { Alert, CustomStatusBadge, Field, Spinner } from '@/components/ui';

export default function AdminCustomOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const [c, setC] = useState<CustomOrder | null>(null);
  const [error, setError] = useState('');
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [status, setStatus] = useState<CustomOrderStatus>('REQUESTED');
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  const fill = (data: CustomOrder) => {
    setC(data);
    setPrice(centsToInput(data.quotedPriceCents));
    setMessage(data.quoteMessage ?? '');
    setAdminNotes(data.adminNotes ?? '');
    setStatus(data.status);
  };

  const load = useCallback(() => {
    api<CustomOrder>(`/admin/custom-orders/${id}`).then(fill).catch((e) => setError(errorMessage(e)));
  }, [id]);
  useEffect(load, [load]);

  async function save(nextStatus?: CustomOrderStatus) {
    setSaving(true);
    try {
      const data = await api<CustomOrder>(`/admin/custom-orders/${id}`, {
        method: 'PATCH',
        body: {
          // Só envia o status se mudou (evita reenviar e-mails ao salvar anotações)
          status: nextStatus ?? (status !== c?.status ? status : undefined),
          quotedPriceCents: price ? parseBRL(price) : null,
          quoteMessage: message,
          adminNotes,
          notify,
        },
      });
      fill(data);
      toast(nextStatus === 'QUOTED' ? 'Orçamento enviado ao cliente! ✉️' : 'Encomenda atualizada.');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!c) return <div className="skeleton h-96" />;

  const details: [string, string | null][] = [
    ['Data do evento', formatDate(c.eventDate)],
    ['Convidados', `${c.guests} pessoas`],
    ['Tamanho', c.size],
    ['Massa', c.flavor],
    ['Recheio', c.filling],
    ['Cobertura', c.frosting],
    ['Entrega', c.fulfillmentType === 'PICKUP' ? 'Cliente vai retirar' : 'Entregar no endereço do cliente'],
  ];

  return (
    <>
      <Link href="/admin/encomendas" className="text-sm text-cocoa-400 hover:text-cocoa-700">
        ← Encomendas
      </Link>
      <AdminPageHeader
        title={`${c.eventType} · ${formatDate(c.eventDate)}`}
        subtitle={`Encomenda ${c.number} · recebida em ${formatDateTime(c.createdAt)}`}
        actions={<CustomStatusBadge status={c.status} />}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="heading-md mb-4 text-xl">Pedido do cliente</h2>
            <div className="flex flex-col gap-6 sm:flex-row">
              {c.referenceImageUrl && (
                <a href={c.referenceImageUrl} target="_blank" rel="noopener noreferrer" className="relative block h-48 w-full shrink-0 overflow-hidden rounded-2xl bg-blush-100 sm:w-48">
                  <SafeImage src={c.referenceImageUrl} alt="Imagem de referência enviada pelo cliente" fill sizes="192px" className="object-cover" />
                </a>
              )}
              <dl className="grid flex-1 gap-3 text-sm sm:grid-cols-2">
                {details
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs uppercase tracking-wider text-cocoa-400">{k}</dt>
                      <dd className="text-cocoa-800">{v}</dd>
                    </div>
                  ))}
              </dl>
            </div>
            {c.notes && (
              <div className="mt-6 rounded-2xl bg-blush-50 p-4 text-sm">
                <p className="mb-1 text-xs uppercase tracking-wider text-cocoa-400">Observações</p>
                <p className="whitespace-pre-line text-cocoa-700">{c.notes}</p>
              </div>
            )}
          </section>

          <section className="card space-y-2 p-6 text-sm">
            <h2 className="heading-md mb-2 text-xl">Contato</h2>
            <p className="font-medium text-cocoa-800">{c.customerName}</p>
            <p>
              <a href={`mailto:${c.customerEmail}`} className="link">
                {c.customerEmail}
              </a>
            </p>
            <p>
              <a
                href={whatsappLink(`55${c.customerPhone.replace(/\D/g, '')}`, `Olá, ${c.customerName.split(' ')[0]}! Aqui é a Rafaella, sobre a sua encomenda para ${formatDate(c.eventDate)} 💕`)}
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                {c.customerPhone} (WhatsApp)
              </a>
            </p>
            {c.order && (
              <p className="pt-2">
                Pedido de pagamento:{' '}
                <Link href={`/admin/pedidos/${c.order.id}`} className="link">
                  {ORDER_STATUS[c.order.status].label}
                </Link>
              </p>
            )}
          </section>

          {c.statusHistory && c.statusHistory.length > 0 && (
            <section className="card p-6 text-sm">
              <h2 className="heading-md mb-4 text-xl">Histórico</h2>
              <ol className="space-y-3">
                {c.statusHistory.map((h, i) => (
                  <li key={i} className="border-l-2 border-blush-200 pl-3">
                    <p className="font-medium text-cocoa-700">{CUSTOM_STATUS[h.status].label}</p>
                    <p className="text-xs text-cocoa-400">
                      {formatDateTime(h.createdAt)}
                      {h.note ? ` · ${h.note}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="card space-y-4 p-6">
            <h2 className="heading-md text-xl">Orçamento</h2>
            <Field label="Valor (R$)" htmlFor="price" hint="Inclua a entrega no valor, se houver.">
              <input id="price" inputMode="decimal" className="input text-lg" placeholder="0,00" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field label="Mensagem para o cliente" htmlFor="message">
              <textarea id="message" rows={4} className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Detalhes do que está incluso, sugestões..." />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Enviar e-mail ao cliente
            </label>
            {['REQUESTED', 'QUOTED'].includes(c.status) && (
              <button type="button" className="btn-primary w-full" disabled={saving || !price} onClick={() => save('QUOTED')}>
                {saving && <Spinner />} {c.status === 'QUOTED' ? 'Reenviar orçamento' : 'Enviar orçamento'}
              </button>
            )}
            {c.status === 'REQUESTED' && (
              <button type="button" className="btn-danger w-full" disabled={saving} onClick={() => save('REJECTED')}>
                Não conseguiremos atender
              </button>
            )}
          </section>

          <section className="card space-y-4 p-6">
            <h2 className="heading-md text-xl">Status e anotações</h2>
            <div>
              <label htmlFor="status" className="label">
                Status
              </label>
              <select id="status" className="input" value={status} onChange={(e) => setStatus(e.target.value as CustomOrderStatus)}>
                {Object.entries(CUSTOM_STATUS).map(([value, s]) => (
                  <option key={value} value={value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Anotações internas" htmlFor="adminNotes" hint="Visível apenas no painel.">
              <textarea id="adminNotes" rows={4} className="input" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
            </Field>
            <button type="button" className="btn-outline w-full" disabled={saving} onClick={() => save()}>
              Salvar alterações
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
