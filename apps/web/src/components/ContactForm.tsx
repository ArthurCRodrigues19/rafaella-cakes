'use client';

import { useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatPhone } from '@/lib/format';
import { Alert, Field, Spinner } from './ui';

export function ContactForm() {
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = Object.fromEntries(new FormData(formEl));
    setSending(true);
    setStatus(null);
    setErrors({});
    try {
      const res = await api<{ message: string }>('/contact', { body: { ...form, phone } });
      setStatus({ tone: 'success', text: res.message });
      formEl.reset();
      setPhone('');
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setStatus({ tone: 'error', text: errorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6 sm:p-8">
      <h2 className="heading-md text-xl">Mande uma mensagem</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" htmlFor="c-name" error={errors.name}>
          <input id="c-name" name="name" required autoComplete="name" className="input" />
        </Field>
        <Field label="E-mail" htmlFor="c-email" error={errors.email}>
          <input id="c-email" name="email" type="email" required autoComplete="email" className="input" />
        </Field>
      </div>
      <Field label="Telefone (opcional)" htmlFor="c-phone">
        <input id="c-phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} />
      </Field>
      <Field label="Mensagem" htmlFor="c-message" error={errors.message}>
        <textarea id="c-message" name="message" required rows={5} maxLength={3000} className="input" />
      </Field>
      {/* Campo-isca anti-spam: invisível para pessoas */}
      <div className="hidden" aria-hidden>
        <label htmlFor="c-website">Não preencha</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {status && <Alert tone={status.tone}>{status.text}</Alert>}
      <button className="btn-primary" disabled={sending}>
        {sending && <Spinner />} Enviar mensagem
      </button>
    </form>
  );
}
