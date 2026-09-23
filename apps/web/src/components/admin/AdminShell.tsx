'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import {
  BoxIcon,
  ChartIcon,
  CloseIcon,
  ImageIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
  SparkleIcon,
  StarIcon,
  TagIcon,
  UsersIcon,
  BagIcon,
} from '../icons';
import { Logo } from '../layout/Logo';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: ChartIcon },
  { href: '/admin/pedidos', label: 'Pedidos', icon: BagIcon },
  { href: '/admin/encomendas', label: 'Encomendas', icon: SparkleIcon },
  { href: '/admin/produtos', label: 'Produtos', icon: BoxIcon },
  { href: '/admin/categorias', label: 'Categorias', icon: TagIcon },
  { href: '/admin/clientes', label: 'Clientes', icon: UsersIcon },
  { href: '/admin/avaliacoes', label: 'Avaliações', icon: StarIcon },
  { href: '/admin/galeria', label: 'Galeria', icon: ImageIcon },
  { href: '/admin/configuracoes', label: 'Configurações', icon: SettingsIcon },
];

/** Estrutura do painel: protege as rotas (só ADMIN) e mostra o menu lateral. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/admin/login');
  }, [loading, user, router]);
  useEffect(() => setOpen(false), [pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-cocoa-400">
        <span className="font-script text-3xl">Carregando...</span>
      </div>
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="heading-md">Acesso restrito</h1>
        <p className="text-cocoa-500">Esta área é exclusiva da administração da loja.</p>
        <Link href="/" className="btn-primary">
          Voltar para o site
        </Link>
      </div>
    );
  }

  const active = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Painel" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm transition ${
            active(href) ? 'bg-cocoa-700 text-cream shadow-card' : 'text-cocoa-600 hover:bg-blush-100'
          }`}
        >
          <Icon width={18} height={18} /> {label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="lg:grid lg:grid-cols-[250px_1fr]">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-blush-100 bg-white p-6 lg:flex">
        <div className="mb-8 text-center">
          <Logo />
          <p className="mt-2 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-cocoa-300">Painel</p>
        </div>
        {nav}
        <div className="mt-auto space-y-1 border-t border-blush-100 pt-4 text-sm">
          <p className="px-4 text-cocoa-400">{user.name}</p>
          <Link href="/" className="block rounded-2xl px-4 py-2 text-cocoa-600 hover:bg-blush-100" target="_blank">
            Ver site ↗
          </Link>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.replace('/admin/login');
            }}
            className="flex w-full items-center gap-2 rounded-2xl px-4 py-2 text-cocoa-600 hover:bg-blush-100 hover:text-red-700"
          >
            <LogoutIcon width={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Topo mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-blush-100 bg-white px-4 py-3 lg:hidden">
        <button type="button" className="btn-ghost px-2" onClick={() => setOpen(true)} aria-label="Abrir menu">
          <MenuIcon />
        </button>
        <Logo className="scale-75" />
        <Link href="/" className="text-xs text-cocoa-500">
          Site ↗
        </Link>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-cocoa-900/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white p-6 shadow-soft">
            <div className="mb-6 flex justify-end">
              <button type="button" className="btn-ghost px-2" onClick={() => setOpen(false)} aria-label="Fechar menu">
                <CloseIcon />
              </button>
            </div>
            {nav}
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.replace('/admin/login');
              }}
              className="mt-6 flex items-center gap-2 px-4 text-sm text-cocoa-600"
            >
              <LogoutIcon width={16} /> Sair
            </button>
          </div>
        </div>
      )}

      <main className="min-w-0 p-4 sm:p-8">{children}</main>
    </div>
  );
}

export function AdminPageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="heading-lg text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-cocoa-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
