'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatDate, formatPhone } from '@/lib/format';
import { useAuth } from '../providers/AuthProvider';
import { Alert, Field, Spinner } from '../ui';
import { CheckIcon, UploadIcon } from '../icons';

const EVENT_TYPES = ['Aniversário', 'Casamento', 'Noivado', 'Chá de bebê / revelação', 'Batizado', 'Festa corporativa', 'Outro'];
const FLAVORS = ['Baunilha', 'Chocolate', 'Red velvet', 'Nozes', 'Cenoura', 'Limão siciliano', 'Coco', 'Outro (descrever)'];
const FILLINGS = ['Brigadeiro', 'Brigadeiro branco', 'Doce de leite', 'Ninho com morango', 'Frutas vermelhas', 'Mousse de maracujá', 'Ganache de chocolate belga', 'Nozes com doce de leite'];
const FROSTINGS = ['Chantininho', 'Buttercream', 'Ganache', 'Pasta americana', 'Naked (sem cobertura lateral)', 'Semi naked'];
const SIZES = ['Até 15 pessoas', '15 a 30 pessoas', '30 a 50 pessoas', '2 andares', '3 andares ou mais', 'Só doces (sem bolo)'];

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function CustomOrderForm({ minLeadDays }: { minLeadDays: number }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ number: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const minDate = addDays(minLeadDays);

  useEffect(() => {
    if (!user) return;
    setName((v) => v || user.name);
    setEmail((v) => v || user.email);
    setPhone((v) => v || (user.phone ? formatPhone(user.phone) : ''));
  }, [user]);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onFile(f: File | undefined) {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setErrors((e) => ({ ...e, referenceImage: 'Envie uma imagem JPG, PNG ou WEBP.' }));
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, referenceImage: 'A imagem deve ter no máximo 5 MB.' }));
      return;
    }
    setErrors(({ referenceImage: _r, ...rest }) => rest);
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set('customerName', name);
    form.set('customerEmail', email);
    form.set('customerPhone', phone);
    form.delete('referenceImage');
    if (file) form.set('referenceImage', file);

    setSending(true);
    setErrors({});
    setError('');
    try {
      const res = await api<{ number: string }>('/custom-orders', { form });
      setDone(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="card mx-auto max-w-xl p-10 text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckIcon width={28} height={28} />
        </span>
        <h2 className="heading-md">Solicitação enviada! ✨</h2>
        <p className="mt-3 text-cocoa-500">
          Sua encomenda <strong>{done.number}</strong> foi recebida. A Rafaella vai analisar cada detalhe e enviar o orçamento para{' '}
          <strong>{email}</strong> em breve.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {user ? (
            <Link href="/conta/encomendas" className="btn-primary">
              Acompanhar na minha conta
            </Link>
          ) : (
            <Link href={`/cadastro?next=/conta/encomendas`} className="btn-primary">
              Criar conta para acompanhar
            </Link>
          )}
          <Link href="/produtos" className="btn-outline">
            Ver o cardápio
          </Link>
        </div>
      </div>
    );
  }

  const err = (k: string) => errors[k];
  const cls = (k: string) => `input ${err(k) ? 'input-error' : ''}`;

  return (
    <form onSubmit={onSubmit} className="card space-y-10 p-6 sm:p-10" noValidate={false}>
      <fieldset className="space-y-5">
        <legend className="heading-md mb-2 text-xl">Seus dados</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Nome" htmlFor="customerName" error={err('customerName')}>
            <input id="customerName" required autoComplete="name" className={cls('customerName')} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="E-mail" htmlFor="customerEmail" error={err('customerEmail')}>
            <input id="customerEmail" type="email" required autoComplete="email" className={cls('customerEmail')} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="WhatsApp" htmlFor="customerPhone" error={err('customerPhone')}>
            <input id="customerPhone" type="tel" required autoComplete="tel" className={cls('customerPhone')} value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(11) 90000-0000" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="heading-md mb-2 text-xl">Sobre o evento</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tipo de evento" htmlFor="eventType" error={err('eventType')}>
            <select id="eventType" name="eventType" required className={cls('eventType')} defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {EVENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Data do evento" htmlFor="eventDate" error={err('eventDate')} hint={`A partir de ${formatDate(minDate)}`}>
            <input id="eventDate" name="eventDate" type="date" required min={minDate} className={cls('eventDate')} />
          </Field>
          <Field label="Quantidade de pessoas" htmlFor="guests" error={err('guests')}>
            <input id="guests" name="guests" type="number" min={1} max={2000} required inputMode="numeric" className={cls('guests')} placeholder="Ex.: 40" />
          </Field>
        </div>
        <fieldset>
          <legend className="label">Entrega ou retirada?</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="fulfillmentType" value="PICKUP" defaultChecked className="accent-cocoa-700" /> Vou retirar
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="fulfillmentType" value="DELIVERY" className="accent-cocoa-700" /> Quero que entreguem
            </label>
          </div>
        </fieldset>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="heading-md mb-2 text-xl">Como você imagina?</legend>
        <p className="-mt-3 text-sm text-cocoa-500">Escolha uma sugestão ou escreva livremente — é só um ponto de partida!</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tamanho" htmlFor="size" error={err('size')}>
            <input id="size" name="size" list="sizes" className={cls('size')} placeholder="Ex.: 2 andares" />
            <datalist id="sizes">{SIZES.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="Sabor da massa" htmlFor="flavor" error={err('flavor')}>
            <input id="flavor" name="flavor" list="flavors" required className={cls('flavor')} placeholder="Ex.: Chocolate" />
            <datalist id="flavors">{FLAVORS.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="Recheio" htmlFor="filling" error={err('filling')}>
            <input id="filling" name="filling" list="fillings" className={cls('filling')} placeholder="Ex.: Ninho com morango" />
            <datalist id="fillings">{FILLINGS.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="Cobertura" htmlFor="frosting" error={err('frosting')}>
            <input id="frosting" name="frosting" list="frostings" className={cls('frosting')} placeholder="Ex.: Chantininho rosa" />
            <datalist id="frostings">{FROSTINGS.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
        </div>
        <Field label="Observações" htmlFor="notes" error={err('notes')} hint="Tema, cores, nome no topo, restrições alimentares, doces extras...">
          <textarea id="notes" name="notes" rows={5} maxLength={2000} className={cls('notes')} />
        </Field>

        <div>
          <span className="label">Imagem de referência (opcional)</span>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files[0]);
            }}
            className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-blush-200 bg-blush-50/50 p-6 text-center sm:flex-row sm:text-left"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Pré-visualização da imagem de referência" className="h-28 w-28 rounded-2xl object-cover" />
            ) : (
              <span className="flex h-28 w-28 items-center justify-center rounded-2xl bg-white text-blush-400">
                <UploadIcon width={32} height={32} />
              </span>
            )}
            <div className="flex-1 text-sm text-cocoa-500">
              <p>Arraste uma foto aqui ou</p>
              <button type="button" className="btn-outline btn-sm mt-2" onClick={() => fileInput.current?.click()}>
                Escolher imagem
              </button>
              {file && (
                <button type="button" className="btn-ghost btn-sm ml-2 mt-2" onClick={() => setFile(null)}>
                  Remover
                </button>
              )}
              <p className="mt-2 text-xs text-cocoa-400">JPG, PNG ou WEBP · até 5 MB</p>
              {err('referenceImage') && <p className="field-error">{err('referenceImage')}</p>}
            </div>
            <input
              ref={fileInput}
              type="file"
              name="referenceImage"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Imagem de referência"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
        </div>
      </fieldset>

      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-col items-center gap-3 border-t border-blush-100 pt-8 sm:flex-row sm:justify-between">
        <p className="text-xs text-cocoa-400">Enviar a solicitação não gera cobrança. Você só paga após aprovar o orçamento.</p>
        <button className="btn-primary w-full sm:w-auto" disabled={sending}>
          {sending && <Spinner />} Enviar solicitação
        </button>
      </div>
    </form>
  );
}
