'use client';

import { useState } from 'react';
import { SafeImage } from '../SafeImage';

export function ProductGallery({ images, name }: { images: { id: string; url: string; alt: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [{ id: 'placeholder', url: '', alt: name }];
  const current = list[Math.min(active, list.length - 1)];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square overflow-hidden rounded-4xl bg-blush-100 shadow-card">
        <SafeImage
          key={current.id}
          src={current.url}
          alt={current.alt}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="animate-fade-up object-cover"
        />
      </div>
      {list.length > 1 && (
        <div className="flex gap-3" role="tablist" aria-label="Fotos do produto">
          {list.map((img, i) => (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Ver foto ${i + 1}: ${img.alt}`}
              onClick={() => setActive(i)}
              className={`relative h-20 w-20 overflow-hidden rounded-2xl transition ${
                i === active ? 'ring-2 ring-cocoa-600 ring-offset-2 ring-offset-cream' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <SafeImage src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
