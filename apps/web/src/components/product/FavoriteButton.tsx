'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../providers/AuthProvider';
import { useFavorites } from '../providers/FavoritesProvider';
import { useToast } from '../providers/ToastProvider';
import { HeartIcon } from '../icons';
import { errorMessage } from '@/lib/api';

export function FavoriteButton({ productId, productName, className = '' }: { productId: string; productName: string; className?: string }) {
  const { user } = useAuth();
  const { ids, toggle } = useFavorites();
  const toast = useToast();
  const router = useRouter();
  const active = ids.has(productId);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    try {
      const now = await toggle(productId);
      toast(now ? 'Adicionado aos favoritos 💕' : 'Removido dos favoritos', 'info');
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `Remover ${productName} dos favoritos` : `Adicionar ${productName} aos favoritos`}
      className={`rounded-full bg-white/90 p-2.5 shadow-card backdrop-blur transition hover:scale-105 ${
        active ? 'text-blush-600' : 'text-cocoa-500 hover:text-blush-600'
      } ${className}`}
    >
      <HeartIcon filled={active} width={18} height={18} />
    </button>
  );
}
