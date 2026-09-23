'use client';

import { useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatPhone } from '@/lib/format';
import type { User } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Alert, Field, Spinner } from '@/components/ui';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ? formatPhone(user.phone) : '');
  const [saving, setSaving] = useState(false);
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  if (!user) return null;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api<{ user: User }>('/me', { method: 'PATCH', body: { name, phone } });
      setUser(res.user);
      toast('Dados atualizados!');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdSaving(true);
    setPwdError('');
    try {
      await api('/auth/change-password', { body: pwd });
      setPwd({ currentPassword: '', newPassword: '' });
      toast('Senha alterada!');
    } catch (err) {
      setPwdError(err instanceof ApiError && err.fields.newPassword ? err.fields.newPassword : errorMessage(err));
    } finally {
      setPwdSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={saveProfile} className="card space-y-5 p-6 sm:p-8">
        <h2 className="heading-md text-xl">Meus dados</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" htmlFor="name">
            <input id="name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Celular / WhatsApp" htmlFor="phone">
            <input id="phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} />
          </Field>
          <Field label="E-mail" htmlFor="email" hint="Para alterar o e-mail, fale com a gente.">
            <input id="email" className="input bg-cocoa-50" value={user.email} disabled />
          </Field>
        </div>
        <button className="btn-primary" disabled={saving}>
          {saving && <Spinner />} Salvar
        </button>
      </form>

      <form onSubmit={changePassword} className="card space-y-5 p-6 sm:p-8">
        <h2 className="heading-md text-xl">{user.hasGoogle ? 'Definir / alterar senha' : 'Alterar senha'}</h2>
        {user.hasGoogle && <p className="text-sm text-cocoa-500">Sua conta está conectada ao Google. Se ainda não tem senha, deixe “senha atual” em branco.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha atual" htmlFor="current">
            <input id="current" type="password" autoComplete="current-password" className="input" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} />
          </Field>
          <Field label="Nova senha" htmlFor="new" hint="Mínimo de 8 caracteres, com letras e números.">
            <input id="new" type="password" autoComplete="new-password" required minLength={8} className="input" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} />
          </Field>
        </div>
        {pwdError && <Alert tone="error">{pwdError}</Alert>}
        <button className="btn-outline" disabled={pwdSaving}>
          {pwdSaving && <Spinner />} Alterar senha
        </button>
      </form>
    </div>
  );
}
