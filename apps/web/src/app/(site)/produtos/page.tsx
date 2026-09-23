import type { Metadata } from 'next';
import Link from 'next/link';
import { serverGet } from '@/lib/server-api';
import type { Category, Paginated, ProductCard as ProductCardType } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';
import { SortSelect } from '@/components/product/SortSelect';
import { EmptyState } from '@/components/ui';
import { SearchIcon } from '@/components/icons';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const category = one(sp.category);
  const categories = await serverGet<Category[]>('/categories', 300);
  const cat = categories?.find((c) => c.slug === category);
  return {
    title: cat ? `${cat.name} artesanais` : 'Cardápio',
    description: cat?.description ?? 'Bolos, doces finos, tortas, cupcakes e salgados artesanais. Peça online com entrega ou retirada.',
    alternates: { canonical: cat ? `/produtos?category=${cat.slug}` : '/produtos' },
  };
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = one(sp.q);
  const category = one(sp.category);
  const sort = one(sp.sort) || 'relevance';
  const minPrice = one(sp.minPrice);
  const maxPrice = one(sp.maxPrice);
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (sort) params.set('sort', sort);
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);
  params.set('page', String(page));
  params.set('pageSize', '12');

  const [result, categories] = await Promise.all([
    serverGet<Paginated<ProductCardType>>(`/products?${params}`, 15),
    serverGet<Category[]>('/categories', 300),
  ]);
  const current = categories?.find((c) => c.slug === category);

  const hrefWith = (changes: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    p.delete('pageSize');
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '') p.delete(k);
      else p.set(k, v);
    }
    if (!('page' in changes)) p.delete('page');
    const s = p.toString();
    return s ? `/produtos?${s}` : '/produtos';
  };

  return (
    <div className="container-page py-10 md:py-14">
      <header className="mb-8 text-center">
        <p className="eyebrow mb-3">Cardápio</p>
        <h1 className="heading-lg">{current ? current.name : q ? `Resultados para “${q}”` : 'Nossas delícias'}</h1>
        {current?.description && <p className="mx-auto mt-3 max-w-xl text-cocoa-500">{current.description}</p>}
      </header>

      {/* Categorias */}
      <nav aria-label="Categorias" className="scrollbar-none -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:flex-wrap sm:justify-center">
        <Link
          href={hrefWith({ category: null })}
          className={`shrink-0 rounded-full px-5 py-2 text-sm transition ${!category ? 'bg-cocoa-700 text-cream' : 'bg-white text-cocoa-600 ring-1 ring-blush-200 hover:bg-blush-50'}`}
          aria-current={!category ? 'page' : undefined}
        >
          Todos
        </Link>
        {categories?.map((c) => (
          <Link
            key={c.id}
            href={hrefWith({ category: c.slug })}
            className={`shrink-0 rounded-full px-5 py-2 text-sm transition ${
              category === c.slug ? 'bg-cocoa-700 text-cream' : 'bg-white text-cocoa-600 ring-1 ring-blush-200 hover:bg-blush-50'
            }`}
            aria-current={category === c.slug ? 'page' : undefined}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      {/* Busca e filtros (formulário GET: funciona até sem JavaScript) */}
      <form action="/produtos" method="get" className="card mb-10 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-end" role="search">
        {category && <input type="hidden" name="category" value={category} />}
        <div>
          <label htmlFor="q" className="label">
            Buscar
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cocoa-300" width={18} />
            <input id="q" name="q" defaultValue={q} className="input pl-11" placeholder="Ex.: brigadeiro, morango, chocolate..." />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:w-56">
          <div>
            <label htmlFor="minPrice" className="label">
              Preço mín.
            </label>
            <input id="minPrice" name="minPrice" type="number" min={0} step="1" inputMode="numeric" defaultValue={minPrice} className="input py-2.5" placeholder="R$" />
          </div>
          <div>
            <label htmlFor="maxPrice" className="label">
              Preço máx.
            </label>
            <input id="maxPrice" name="maxPrice" type="number" min={0} step="1" inputMode="numeric" defaultValue={maxPrice} className="input py-2.5" placeholder="R$" />
          </div>
        </div>
        <div>
          <label htmlFor="sort" className="label">
            Ordenar
          </label>
          <SortSelect defaultValue={sort} />
        </div>
        <button className="btn-primary">Filtrar</button>
        {(q || minPrice || maxPrice) && (
          <Link href={category ? `/produtos?category=${category}` : '/produtos'} className="btn-ghost">
            Limpar
          </Link>
        )}
      </form>

      {!result ? (
        <EmptyState title="Não foi possível carregar o cardápio">Tente novamente em alguns instantes.</EmptyState>
      ) : result.items.length === 0 ? (
        <EmptyState
          title="Nenhum doce encontrado"
          action={
            <Link href="/encomendas" className="btn-primary">
              Pedir uma encomenda personalizada
            </Link>
          }
        >
          Tente outra busca — ou conte pra gente o que você procura, que a Rafaella prepara especialmente para você.
        </EmptyState>
      ) : (
        <>
          <p className="mb-6 text-sm text-cocoa-400" aria-live="polite">
            {result.total} {result.total === 1 ? 'produto encontrado' : 'produtos encontrados'}
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
            {result.items.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </div>

          {result.totalPages > 1 && (
            <nav aria-label="Paginação" className="mt-14 flex items-center justify-center gap-2">
              {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={hrefWith({ page: n === 1 ? null : String(n) })}
                  aria-current={n === page ? 'page' : undefined}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm transition ${
                    n === page ? 'bg-cocoa-700 text-cream' : 'bg-white text-cocoa-600 ring-1 ring-blush-200 hover:bg-blush-50'
                  }`}
                >
                  {n}
                </Link>
              ))}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
