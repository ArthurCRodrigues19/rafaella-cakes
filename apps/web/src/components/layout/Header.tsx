'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useCart } from '../providers/CartProvider';
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from '../icons';
import { Logo } from './Logo';

const NAV = [
  { href: '/produtos', label: 'Cardápio' },
  { href: '/encomendas', label: 'Encomendas' },
  { href: '/galeria', label: 'Galeria' },
  { href: '/#sobre', label: 'Sobre' },
  { href: '/contato', label: 'Contato' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { count, hydrated } = useCart();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // Trava a rolagem do fundo com o menu mobile aberto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (href: string) => (href.startsWith('/#') ? false : pathname.startsWith(href));

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('q')?.toString().trim();
    setSearchOpen(false);
    router.push(q ? `/produtos?q=${encodeURIComponent(q)}` : '/produtos');
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled ? 'border-blush-100 bg-cream/90 shadow-sm backdrop-blur-md' : 'border-transparent bg-cream'
      }`}
    >
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Pular para o conteúdo
      </a>

      <div className="bg-blush-200/70 py-1.5 text-center text-xs tracking-wide text-cocoa-600">
        Feito à mão, sob encomenda · Entregas de terça a sábado
      </div>

      <div className="container-page flex h-20 items-center justify-between gap-4">
        <button
          type="button"
          className="btn-ghost -ml-3 px-3 lg:hidden"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={open}
        >
          <MenuIcon width={24} height={24} />
        </button>

        <Logo />

        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-2 text-sm tracking-wide transition hover:bg-blush-100 ${
                isActive(item.href) ? 'text-blush-600' : 'text-cocoa-600'
              }`}
              aria-current={isActive(item.href) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button type="button" className="btn-ghost px-3" onClick={() => setSearchOpen((v) => !v)} aria-label="Buscar produtos">
            <SearchIcon />
          </button>
          <Link href={user ? '/conta/favoritos' : '/entrar?next=/conta/favoritos'} className="btn-ghost hidden px-3 sm:inline-flex" aria-label="Favoritos">
            <HeartIcon />
          </Link>
          <Link href={user ? (user.role === 'ADMIN' ? '/admin' : '/conta') : '/entrar'} className="btn-ghost px-3" aria-label={user ? 'Minha conta' : 'Entrar'}>
            <UserIcon />
            <span className="hidden text-sm xl:inline">{user ? user.name.split(' ')[0] : 'Entrar'}</span>
          </Link>
          <Link href="/carrinho" className="btn-ghost relative px-3" aria-label={`Carrinho com ${count} itens`}>
            <BagIcon />
            {hydrated && count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blush-600 px-1 text-[0.65rem] font-semibold text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-blush-100 bg-cream">
          <form onSubmit={onSearch} className="container-page flex gap-2 py-3" role="search">
            <label htmlFor="header-search" className="sr-only">
              Buscar no cardápio
            </label>
            <input id="header-search" name="q" autoFocus className="input" placeholder="Buscar bolos, brigadeiros, tortas..." />
            <button className="btn-primary">Buscar</button>
          </form>
        </div>
      )}

      {/* Menu mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-cocoa-900/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85%] animate-fade-up flex-col bg-cream p-6 shadow-soft">
            <div className="mb-8 flex items-center justify-between">
              <Logo />
              <button type="button" className="btn-ghost px-3" onClick={() => setOpen(false)} aria-label="Fechar menu">
                <CloseIcon />
              </button>
            </div>
            <nav aria-label="Menu mobile" className="flex flex-col gap-1">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 font-serif text-xl text-cocoa-700 hover:bg-blush-100">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto space-y-2 border-t border-blush-100 pt-6">
              <Link href={user ? '/conta' : '/entrar'} className="btn-outline w-full">
                {user ? 'Minha conta' : 'Entrar ou criar conta'}
              </Link>
              <Link href="/encomendas" className="btn-primary w-full">
                Fazer uma encomenda
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
