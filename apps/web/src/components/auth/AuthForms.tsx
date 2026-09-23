'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatPhone } from '@/lib/format';
import { useAuth } from '../providers/AuthProvider';
import { useToast } from '../providers/ToastProvider';
import { Alert, Field, Spinner } from '../ui';

/** Evita "open redirect": só aceita caminhos internos. */
export const safeNext = (next?: string | null, fallback = '/conta') =>
  next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;

const OAUTH_ERRORS: Record<string, string> = {
  google_desativado: 'O login com Google não está disponível.',
  estado_invalido: 'A sessão de login expirou. Tente novamente.',
  google_falhou: 'Não foi possível entrar com o Google. Tente novamente.',
  sem_email: 'Sua conta Google não compartilhou um e-mail.',
  conta_existente: 'Já existe uma conta com este e-mail. Entre com sua senha.',
};

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-paper py-12 md:py-20">
      <div className="container-page max-w-md">
        <div className="card p-8 sm:p-10">
          <h1 className="heading-md text-center text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-center text-sm text-cocoa-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

function GoogleButton() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    api<{ google: boolean }>('/auth/providers')
      .then((p) => setEnabled(p.google))
      .catch(() => {});
  }, []);
  if (!enabled) return null;
  return (
    <>
      <a href="/api/auth/google" className="btn-outline w-full">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continuar com Google
      </a>
      <div className="my-6 flex items-center gap-3 text-xs text-cocoa-300">
        <span className="h-px flex-1 bg-blush-100" /> ou <span className="h-px flex-1 bg-blush-100" />
      </div>
    </>
  );
}

export function LoginForm({ next, oauthError, admin = false }: { next?: string; oauthError?: string; admin?: boolean }) {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState(oauthError ? OAUTH_ERRORS[oauthError] ?? 'Não foi possível entrar.' : '');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError('');
    try {
      const user = await login(String(form.get('email')), String(form.get('password')), admin);
      router.replace(admin ? '/admin' : safeNext(next, user.role === 'ADMIN' ? '/admin' : '/conta'));
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <>
      {!admin && <GoogleButton />}
      <form onSubmit={onSubmit} className="space-y-5" noValidate={false}>
        <Field label="E-mail" htmlFor="email">
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </Field>
        <Field label="Senha" htmlFor="password">
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading && <Spinner />} Entrar
        </button>
      </form>
      {!admin && (
        <div className="mt-6 space-y-2 text-center text-sm text-cocoa-500">
          <p>
            <Link href="/esqueci-senha" className="link">
              Esqueci minha senha
            </Link>
          </p>
          <p>
            Ainda não tem conta?{' '}
            <Link href={`/cadastro${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="link font-medium">
              Criar conta
            </Link>
          </p>
        </div>
      )}
    </>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const { register } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password'));
    if (password !== String(form.get('confirm'))) {
      setErrors({ confirm: 'As senhas não conferem' });
      return;
    }
    setLoading(true);
    setErrors({});
    setError('');
    try {
      await register({
        name: String(form.get('name')),
        email: String(form.get('email')),
        phone: phone || undefined,
        password,
      });
      toast('Conta criada! Boas-vindas 💕');
      router.replace(safeNext(next));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  const err = (k: string) => errors[k];

  return (
    <>
      <GoogleButton />
      <form onSubmit={onSubmit} className="space-y-5">
        <Field label="Nome completo" htmlFor="name" error={err('name')}>
          <input id="name" name="name" autoComplete="name" required maxLength={100} className={`input ${err('name') ? 'input-error' : ''}`} />
        </Field>
        <Field label="E-mail" htmlFor="email" error={err('email')}>
          <input id="email" name="email" type="email" autoComplete="email" required className={`input ${err('email') ? 'input-error' : ''}`} />
        </Field>
        <Field label="Celular / WhatsApp (opcional)" htmlFor="phone" error={err('phone')}>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            className="input"
            placeholder="(11) 90000-0000"
          />
        </Field>
        <Field label="Senha" htmlFor="password" error={err('password')} hint="Mínimo de 8 caracteres, com letras e números.">
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className={`input ${err('password') ? 'input-error' : ''}`} />
        </Field>
        <Field label="Confirme a senha" htmlFor="confirm" error={err('confirm')}>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={`input ${err('confirm') ? 'input-error' : ''}`} />
        </Field>
        {error && !Object.keys(errors).length && <Alert tone="error">{error}</Alert>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading && <Spinner />} Criar conta
        </button>
        <p className="text-center text-xs text-cocoa-400">
          Ao criar sua conta, você concorda com o uso dos seus dados para processar pedidos, conforme a LGPD.
        </p>
      </form>
      <p className="mt-6 text-center text-sm text-cocoa-500">
        Já tem conta?{' '}
        <Link href={`/entrar${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="link font-medium">
          Entrar
        </Link>
      </p>
    </>
  );
}

export function ForgotPasswordForm() {
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email'));
    setLoading(true);
    setError('');
    try {
      const res = await api<{ message: string }>('/auth/forgot-password', { body: { email } });
      setDone(res.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-6 text-center">
        <Alert tone="success">{done}</Alert>
        <Link href="/entrar" className="btn-outline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="E-mail da sua conta" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </Field>
      {error && <Alert tone="error">{error}</Alert>}
      <button className="btn-primary w-full" disabled={loading}>
        {loading && <Spinner />} Enviar link
      </button>
      <p className="text-center text-sm">
        <Link href="/entrar" className="link">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const toast = useToast();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) return <Alert tone="error">Link inválido. Solicite uma nova redefinição de senha.</Alert>;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password'));
    if (password !== String(form.get('confirm'))) {
      setError('As senhas não conferem.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api<{ user: import('@/lib/types').User }>('/auth/reset-password', { body: { token, password } });
      setUser(res.user);
      toast('Senha alterada com sucesso!');
      router.replace('/conta');
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Nova senha" htmlFor="password" hint="Mínimo de 8 caracteres, com letras e números.">
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input" />
      </Field>
      <Field label="Confirme a nova senha" htmlFor="confirm">
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" />
      </Field>
      {error && <Alert tone="error">{error}</Alert>}
      <button className="btn-primary w-full" disabled={loading}>
        {loading && <Spinner />} Salvar nova senha
      </button>
    </form>
  );
}
