'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './AuthProvider';

interface FavoritesValue {
  ids: Set<string>;
  toggle: (productId: string) => Promise<boolean>;
}

const FavoritesContext = createContext<FavoritesValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    api<string[]>('/me/favorites/ids')
      .then((list) => setIds(new Set(list)))
      .catch(() => {});
  }, [user]);

  /** Retorna o novo estado (true = favoritado). */
  const toggle = useCallback(
    async (productId: string) => {
      const isFav = ids.has(productId);
      // Atualização otimista
      setIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(productId);
        else next.add(productId);
        return next;
      });
      try {
        await api(`/me/favorites/${productId}`, { method: isFav ? 'DELETE' : 'POST' });
        return !isFav;
      } catch (error) {
        setIds((prev) => {
          const next = new Set(prev);
          if (isFav) next.add(productId);
          else next.delete(productId);
          return next;
        });
        throw error;
      }
    },
    [ids],
  );

  const value = useMemo(() => ({ ids, toggle }), [ids, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites precisa estar dentro de <FavoritesProvider>');
  return ctx;
}
