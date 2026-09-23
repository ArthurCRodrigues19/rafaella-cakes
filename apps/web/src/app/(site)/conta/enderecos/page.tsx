'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatCep } from '@/lib/format';
import type { Address, AddressInput } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { AddressForm, EMPTY_ADDRESS } from '@/components/checkout/AddressForm';
import { Alert, Spinner } from '@/components/ui';
import { PlusIcon } from '@/components/icons';

export default function AddressesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [list, setList] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; data: AddressInput } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<Address[]>('/me/addresses').then(setList).catch(() => setList([]));
  }, []);
  useEffect(load, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setErrors({});
    setError('');
    try {
      if (editing.id) await api(`/me/addresses/${editing.id}`, { method: 'PUT', body: editing.data });
      else await api('/me/addresses', { body: editing.data });
      toast('Endereço salvo!');
      setEditing(null);
      load();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Remover este endereço?')) return;
    await api(`/me/addresses/${id}`, { method: 'DELETE' }).catch(() => {});
    load();
  }

  if (!list) return <div className="skeleton h-64" />;

  if (editing) {
    return (
      <form onSubmit={save} className="card space-y-6 p-6 sm:p-8">
        <h2 className="heading-md text-xl">{editing.id ? 'Editar endereço' : 'Novo endereço'}</h2>
        <AddressForm value={editing.data} onChange={(data) => setEditing({ ...editing, data })} errors={errors} showDefault />
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex gap-3">
          <button className="btn-primary" disabled={saving}>
            {saving && <Spinner />} Salvar endereço
          </button>
          <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((a) => (
          <div key={a.id} className="card p-5 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-serif text-lg text-cocoa-800">{a.label}</span>
              {a.isDefault && <span className="rounded-full bg-blush-100 px-3 py-1 text-xs text-blush-700">Principal</span>}
            </div>
            <p className="text-cocoa-600">
              {a.recipient}
              <br />
              {a.street}, {a.number}
              {a.complement ? ` — ${a.complement}` : ''}
              <br />
              {a.neighborhood} · {a.city}/{a.state} · {formatCep(a.zipCode)}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={() => {
                  const { id, ...data } = a;
                  setEditing({ id, data: { ...data, complement: data.complement ?? '', reference: data.reference ?? '' } });
                }}
              >
                Editar
              </button>
              <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => remove(a.id)}>
                Remover
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setEditing({ id: null, data: { ...EMPTY_ADDRESS, recipient: user?.name ?? '' } })}
          className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-blush-200 text-cocoa-500 transition hover:border-blush-400 hover:text-cocoa-700"
        >
          <PlusIcon /> Adicionar endereço
        </button>
      </div>
    </div>
  );
}
