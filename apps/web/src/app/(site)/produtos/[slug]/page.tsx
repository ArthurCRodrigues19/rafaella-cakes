import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverGet } from '@/lib/server-api';
import type { ProductDetail } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { ProductGallery } from '@/components/product/ProductGallery';
import { AddToCart } from '@/components/product/AddToCart';
import { FavoriteButton } from '@/components/product/FavoriteButton';
import { ReviewForm } from '@/components/product/ReviewForm';
import { ProductCard } from '@/components/product/ProductCard';
import { Stars } from '@/components/ui';
import { ClockIcon, StoreIcon, TruckIcon } from '@/components/icons';

type Params = Promise<{ slug: string }>;

const getProduct = (slug: string) => serverGet<ProductDetail>(`/products/${encodeURIComponent(slug)}`, 15);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Produto não encontrado' };
  const image = product.images[0];
  return {
    title: product.name,
    description: product.shortDescription ?? product.description.slice(0, 155),
    alternates: { canonical: `/produtos/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.shortDescription ?? undefined,
      images: image?.url.startsWith('https://') ? [{ url: image.url, alt: image.alt }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? product.description,
    image: product.images.map((i) => i.url).filter((u) => u.startsWith('https://')),
    category: product.category.name,
    brand: { '@type': 'Brand', name: 'Rafaella Cakes' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'BRL',
      lowPrice: (Math.min(...product.variants.map((v) => v.priceCents)) / 100).toFixed(2),
      highPrice: (Math.max(...product.variants.map((v) => v.priceCents)) / 100).toFixed(2),
      availability: product.variants.some((v) => v.available) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    ...(product.rating.count > 0 && {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating.average.toFixed(1), reviewCount: product.rating.count },
    }),
  };

  return (
    <div className="container-page py-8 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <nav aria-label="Você está em" className="mb-6 text-sm text-cocoa-400">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-cocoa-700">
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/produtos?category=${product.category.slug}`} className="hover:text-cocoa-700">
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-cocoa-600">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <p className="eyebrow mb-2">{product.category.name}</p>
          <div className="flex items-start justify-between gap-4">
            <h1 className="heading-lg">{product.name}</h1>
            <FavoriteButton productId={product.id} productName={product.name} className="mt-1 shrink-0" />
          </div>
          {product.rating.count > 0 && (
            <a href="#avaliacoes" className="mt-3 inline-flex items-center gap-2 text-sm text-cocoa-500 hover:text-cocoa-700">
              <Stars value={product.rating.average} /> {product.rating.average.toFixed(1)} ({product.rating.count}{' '}
              {product.rating.count === 1 ? 'avaliação' : 'avaliações'})
            </a>
          )}
          {product.shortDescription && <p className="mt-4 text-lg leading-relaxed text-cocoa-500">{product.shortDescription}</p>}

          <div className="mt-8">
            <AddToCart product={product} />
          </div>

          <ul className="mt-8 grid gap-3 rounded-3xl bg-blush-50 p-5 text-sm text-cocoa-600 sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <ClockIcon className="shrink-0 text-blush-600" />
              {product.leadTimeDays ? `Encomende com ${product.leadTimeDays} dias` : 'Feito sob encomenda'}
            </li>
            <li className="flex items-center gap-2">
              <TruckIcon className="shrink-0 text-blush-600" /> Entrega agendada
            </li>
            <li className="flex items-center gap-2">
              <StoreIcon className="shrink-0 text-blush-600" /> Retirada grátis
            </li>
          </ul>

          <section className="mt-10" aria-labelledby="descricao">
            <h2 id="descricao" className="heading-md mb-3 text-xl">
              Descrição
            </h2>
            <div className="prose-soft">
              {product.description.split(/\n{2,}/).map((para, i) => (
                <p key={i} className="whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Avaliações */}
      <section id="avaliacoes" className="mt-20 scroll-mt-28 border-t border-blush-100 pt-14" aria-labelledby="avaliacoes-title">
        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <h2 id="avaliacoes-title" className="heading-md mb-6">
              O que dizem os clientes
            </h2>
            {product.reviews.length === 0 ? (
              <p className="text-cocoa-500">Ainda não há avaliações. Seja a primeira pessoa a avaliar!</p>
            ) : (
              <ul className="space-y-5">
                {product.reviews.map((r) => (
                  <li key={r.id} className="card p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-cocoa-800">{r.authorName}</span>
                      <span className="text-xs text-cocoa-400">{formatDate(r.createdAt)}</span>
                    </div>
                    <Stars value={r.rating} size={14} />
                    <p className="mt-3 leading-relaxed text-cocoa-600">{r.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ReviewForm slug={product.slug} />
        </div>
      </section>

      {product.related.length > 0 && (
        <section className="mt-20" aria-labelledby="relacionados">
          <h2 id="relacionados" className="heading-md mb-8">
            Você também vai amar
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {product.related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
