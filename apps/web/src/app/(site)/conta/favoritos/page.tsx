'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ProductCard as ProductCardType } from '@/lib/types';
import { useFavorites } from '@/components/providers/FavoritesProvider';
import { ProductCard } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/ui';

export default function FavoritesPage() {
  const { ids } = useFavorites();
  const [products, setProducts] = useState<ProductCardType[] | null>(null);

  useEffect(() => {
    api<ProductCardType[]>('/me/favorites').then(setProducts).catch(() => setProducts([]));
  }, []);

  if (!products) return <div className="skeleton h-64" />;
  // Some da lista na hora ao desfavoritar
  const visible = products.filter((p) => ids.has(p.id));

  if (!visible.length) {
    return (
      <EmptyState title="Nenhum favorito ainda" action={<Link href="/produtos" className="btn-primary">Explorar o cardápio</Link>}>
        Toque no coração dos produtos para guardá-los aqui.
      </EmptyState>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
      {visible.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
