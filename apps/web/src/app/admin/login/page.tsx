import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/AuthForms';
import { Logo } from '@/components/layout/Logo';

export const metadata: Metadata = { title: 'Acesso restrito' };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-cocoa-400">Painel administrativo</p>
        </div>
        <div className="card p-8">
          <LoginForm admin />
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/" className="link">
            ← Voltar para o site
          </Link>
        </p>
      </div>
    </div>
  );
}
