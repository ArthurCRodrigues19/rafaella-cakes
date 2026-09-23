import Link from 'next/link';
import type { ProductCard as ProductCardType } from '@/lib/types';
import { formatBRL } from '@/lib/format';
import { SafeImage } from '../SafeImage';
import { FavoriteButton } from './FavoriteButton';

export function ProductCard({ product, priority = false }: { product: ProductCardType; priority?: boolean }) {
  return (
    <article className="group relative flex flex-col">
      <Link
        href={`/produtos/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden rounded-3xl bg-blush-100"
      >
        <SafeImage
          src={product.image?.url}
          alt={product.image?.alt ?? product.name}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.isFeatured && (
            <span className="rounded-full bg-white/90 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-champagne-600 backdrop-blur">
              Favorito<span className="hidden sm:inline"> da casa</span>
            </span>
          )}
          {product.soldOut && (
            <span className="rounded-full bg-cocoa-700/90 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-cream">
              Esgotado
            </span>
          )}
        </div>
      </Link>
      <FavoriteButton productId={product.id} productName={product.name} className="absolute right-3 top-3" />

      <div className="mt-4 flex flex-1 flex-col px-1">
        <p className="eyebrow mb-1 text-[0.65rem]">{product.category.name}</p>
        <h3 className="font-serif text-lg leading-snug text-cocoa-800">
          <Link href={`/produtos/${product.slug}`} className="hover:text-blush-600">
            {product.name}
          </Link>
        </h3>
        {product.shortDescription && (
          <p className="mt-1 line-clamp-2 text-sm text-cocoa-500">{product.shortDescription}</p>
        )}
        <p className="mt-auto pt-3 text-sm text-cocoa-600">
          {product.hasVariants && <span className="text-cocoa-400">a partir de </span>}
          <span className="font-semibold text-cocoa-800">{formatBRL(product.priceFromCents)}</span>
        </p>
      </div>
    </article>
  );
}
