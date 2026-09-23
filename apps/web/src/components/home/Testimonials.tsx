import Link from 'next/link';
import type { Testimonial } from '@/lib/types';
import { Stars } from '../ui';

export function Testimonials({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {items.slice(0, 6).map((t) => (
        <figure key={t.id} className="card relative flex flex-col p-8">
          <span className="absolute -top-5 left-8 font-serif text-7xl leading-none text-blush-300" aria-hidden>
            “
          </span>
          <Stars value={t.rating} />
          <blockquote className="mt-4 flex-1 font-serif text-lg italic leading-relaxed text-cocoa-700">{t.comment}</blockquote>
          <figcaption className="mt-6 border-t border-blush-100 pt-4 text-sm">
            <span className="font-semibold text-cocoa-800">{t.authorName}</span>
            {t.product && (
              <span className="block text-cocoa-400">
                sobre{' '}
                <Link href={`/produtos/${t.product.slug}`} className="link">
                  {t.product.name}
                </Link>
              </span>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
