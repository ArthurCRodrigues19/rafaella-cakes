'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { formatBRL, formatCep } from '@/lib/format';
import type { AddressInput, ShippingQuote } from '@/lib/types';
import { Field, Spinner } from '../ui';

export const EMPTY_ADDRESS: AddressInput = {
  label: 'Casa',
  recipient: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  reference: '',
  isDefault: false,
};

/**
 * Formulário de endereço com preenchimento automático pelo CEP (ViaCEP via API)
 * e aviso se o endereço está dentro da área de entrega.
 */
export function AddressForm({
  value,
  onChange,
  errors = {},
  showDefault = false,
  idPrefix = 'addr',
}: {
  value: AddressInput;
  onChange: (value: AddressInput) => void;
  errors?: Record<string, string>;
  showDefault?: boolean;
  idPrefix?: string;
}) {
  const [looking, setLooking] = useState(false);
  const [quote, setQuote] = useState<ShippingQuote | null>(null);

  const set = <K extends keyof AddressInput>(key: K, v: AddressInput[K]) => onChange({ ...value, [key]: v });
  const id = (k: string) => `${idPrefix}-${k}`;
  const err = (k: string) => errors[k] ?? errors[`address.${k}`];

  async function lookup(cep: string) {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setLooking(true);
    try {
      const q = await api<ShippingQuote>(`/shipping/quote?cep=${digits}`);
      setQuote(q);
      if (q.address) {
        onChange({
          ...value,
          zipCode: digits,
          street: q.address.street || value.street,
          neighborhood: q.address.neighborhood || value.neighborhood,
          city: q.address.city || value.city,
          state: q.address.state || value.state,
        });
      }
    } catch {
      setQuote(null);
    } finally {
      setLooking(false);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <Field label="CEP" htmlFor={id('zip')} error={err('zipCode')} className="sm:col-span-2">
        <div className="relative">
          <input
            id={id('zip')}
            inputMode="numeric"
            autoComplete="postal-code"
            required
            className={`input ${err('zipCode') ? 'input-error' : ''}`}
            value={formatCep(value.zipCode)}
            onChange={(e) => {
              const cep = e.target.value.replace(/\D/g, '').slice(0, 8);
              set('zipCode', cep);
              if (cep.length === 8) void lookup(cep);
              else setQuote(null);
            }}
            placeholder="00000-000"
          />
          {looking && <Spinner className="absolute right-4 top-1/2 -translate-y-1/2 text-cocoa-400" />}
        </div>
      </Field>
      <div className="flex items-end sm:col-span-4">
        {quote && (
          <p className={`pb-3 text-sm ${quote.deliverable ? 'text-emerald-700' : 'text-red-700'}`} role="status">
            {quote.deliverable
              ? `Entregamos aqui! ${quote.zoneName} · frete ${quote.feeCents ? formatBRL(quote.feeCents) : 'grátis'}`
              : 'Ainda não entregamos neste CEP — mas você pode retirar na loja.'}
          </p>
        )}
      </div>
      <Field label="Rua" htmlFor={id('street')} error={err('street')} className="sm:col-span-4">
        <input id={id('street')} autoComplete="address-line1" required className="input" value={value.street} onChange={(e) => set('street', e.target.value)} />
      </Field>
      <Field label="Número" htmlFor={id('number')} error={err('number')} className="sm:col-span-2">
        <input id={id('number')} required className="input" value={value.number} onChange={(e) => set('number', e.target.value)} />
      </Field>
      <Field label="Complemento" htmlFor={id('complement')} className="sm:col-span-3">
        <input id={id('complement')} autoComplete="address-line2" className="input" value={value.complement ?? ''} onChange={(e) => set('complement', e.target.value)} placeholder="Apto, bloco..." />
      </Field>
      <Field label="Bairro" htmlFor={id('neighborhood')} error={err('neighborhood')} className="sm:col-span-3">
        <input id={id('neighborhood')} required className="input" value={value.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
      </Field>
      <Field label="Cidade" htmlFor={id('city')} error={err('city')} className="sm:col-span-4">
        <input id={id('city')} autoComplete="address-level2" required className="input" value={value.city} onChange={(e) => set('city', e.target.value)} />
      </Field>
      <Field label="UF" htmlFor={id('state')} error={err('state')} className="sm:col-span-2">
        <input id={id('state')} autoComplete="address-level1" required maxLength={2} className="input uppercase" value={value.state} onChange={(e) => set('state', e.target.value.toUpperCase())} />
      </Field>
      <Field label="Quem vai receber?" htmlFor={id('recipient')} error={err('recipient')} className="sm:col-span-4">
        <input id={id('recipient')} autoComplete="name" required className="input" value={value.recipient} onChange={(e) => set('recipient', e.target.value)} />
      </Field>
      <Field label="Identificação" htmlFor={id('label')} className="sm:col-span-2">
        <input id={id('label')} className="input" value={value.label} onChange={(e) => set('label', e.target.value)} placeholder="Casa, trabalho..." />
      </Field>
      <Field label="Ponto de referência" htmlFor={id('reference')} className="sm:col-span-6">
        <input id={id('reference')} className="input" value={value.reference ?? ''} onChange={(e) => set('reference', e.target.value)} />
      </Field>
      {showDefault && (
        <label className="flex items-center gap-2 text-sm sm:col-span-6">
          <input type="checkbox" className="checkbox" checked={value.isDefault} onChange={(e) => set('isDefault', e.target.checked)} />
          Usar como endereço principal
        </label>
      )}
    </div>
  );
}
