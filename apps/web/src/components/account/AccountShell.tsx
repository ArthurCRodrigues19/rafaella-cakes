'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { LogoutIcon } from '../icons';

const LINKS = [
  { href: '/conta', label: 'Meus dados' },
  { href: '/conta/pedidos', label: 'Pedidos' },
  { href: '/conta/encomendas', label: 'Encomendas' },
  { href: '/conta/enderecos', label: 'Endereços' },
  { href: '/conta/favoritos', label: 'Favoritos' },
];

/** Layout da "Minha conta": exige login e mostra o menu lateral. */
export function AccountShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/entrar?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="container-page py-14">
        <div className="skeleton h-80" />
      </div>
    );
  }

  const active = (href: string) => (href === '/conta' ? pathname === '/conta' : pathname.startsWith(href));

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-8">
        <p className="eyebrow mb-2">Minha conta</p>
        <h1 className="heading-lg">Olá, {user.name.split(' ')[0]}!</h1>
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Minha conta" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? 'page' : undefined}
              className={`shrink-0 rounded-full px-5 py-2.5 text-sm transition lg:rounded-2xl ${
                active(l.href) ? 'bg-cocoa-700 text-cream' : 'bg-white text-cocoa-600 ring-1 ring-blush-100 hover:bg-blush-50'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user.role === 'ADMIN' && (
            <Link href="/admin" className="shrink-0 rounded-full bg-champagne-100 px-5 py-2.5 text-sm text-champagne-600 lg:rounded-2xl">
              Painel admin
            </Link>
          )}
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.replace('/');
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm text-cocoa-500 hover:text-red-700 lg:rounded-2xl"
          >
            <LogoutIcon width={16} /> Sair
          </button>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
