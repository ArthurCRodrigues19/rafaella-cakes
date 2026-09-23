'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { CartLine } from '@/lib/types';
import { useAuth } from './AuthProvider';

export interface CartItem {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  unitPriceCents: number;
  imageUrl: string | null;
  imageAlt: string | null;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  hydrated: boolean;
  add: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  /** Atualiza nomes/preços com os dados reais do servidor e remove itens indisponíveis */
  reconcile: (lines: CartLine[]) => void;
}

const STORAGE_KEY = 'rc_cart_v1';
const MAX_QTY = 50;
const CartContext = createContext<CartContextValue | null>(null);

const fromLine = (l: CartLine): CartItem => ({
  variantId: l.variantId,
  productId: l.productId,
  productSlug: l.productSlug,
  productName: l.productName,
  variantName: l.variantName,
  unitPriceCents: l.unitPriceCents,
  imageUrl: l.imageUrl,
  imageAlt: l.imageAlt,
  quantity: l.quantity,
});

/**
 * Carrinho persistente:
 * - visitante: salvo no localStorage do navegador
 * - logado: sincronizado com o servidor (fica disponível em qualquer dispositivo);
 *   ao fazer login, o carrinho local é mesclado ao da conta.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const prevUserId = useRef<string | null>(null);
  const serverReady = useRef(false);

  // 1) Carrega do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignora dados corrompidos */
    }
    setHydrated(true);
  }, []);

  // 2) Persiste no localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* armazenamento indisponível (modo privado) */
    }
  }, [items, hydrated]);

  // 3) Login/logout: mescla com o carrinho da conta ou limpa
  useEffect(() => {
    if (loading || !hydrated) return;
    const currentId = user?.id ?? null;
    if (currentId === prevUserId.current) return;
    const wasLoggedIn = prevUserId.current !== null;
    prevUserId.current = currentId;

    if (!currentId) {
      serverReady.current = false;
      if (wasLoggedIn) setItems([]);
      return;
    }

    api<CartLine[]>('/me/cart')
      .then((serverLines) => {
        // Liberado antes do setItems: o efeito (4) salva o resultado da mesclagem no servidor
        serverReady.current = true;
        setItems((local) => {
          const merged = new Map<string, CartItem>();
          for (const l of serverLines) merged.set(l.variantId, fromLine(l));
          for (const i of local) {
            const existing = merged.get(i.variantId);
            merged.set(i.variantId, existing ? { ...existing, quantity: Math.max(existing.quantity, i.quantity) } : i);
          }
          return [...merged.values()];
        });
      })
      .catch(() => {
        serverReady.current = true;
      });
  }, [user, loading, hydrated]);

  // 4) Logado: salva o carrinho no servidor (com debounce)
  useEffect(() => {
    if (!user || !hydrated || !serverReady.current) return;
    const timer = setTimeout(() => {
      api('/me/cart', {
        method: 'PUT',
        body: { items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })) },
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [items, user, hydrated]);

  const add = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((i) => i.variantId === item.variantId);
      if (existing) {
        return current.map((i) =>
          i.variantId === item.variantId ? { ...i, ...item, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i,
        );
      }
      return [...current, { ...item, quantity: Math.min(MAX_QTY, quantity) }];
    });
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((i) => i.variantId !== variantId)
        : current.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(MAX_QTY, quantity) } : i)),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setItems((current) => current.filter((i) => i.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const reconcile = useCallback((lines: CartLine[]) => {
    setItems((current) => {
      const byId = new Map(lines.map((l) => [l.variantId, l]));
      const next = current
        .filter((i) => byId.has(i.variantId))
        .map((i) => {
          const l = byId.get(i.variantId)!;
          return { ...fromLine(l), quantity: i.quantity };
        });
      // Evita re-render se nada mudou
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotalCents: items.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0),
      hydrated,
      add,
      setQuantity,
      remove,
      clear,
      reconcile,
    }),
    [items, hydrated, add, setQuantity, remove, clear, reconcile],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart precisa estar dentro de <CartProvider>');
  return ctx;
}
