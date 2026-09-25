import { env } from '../../config/env';
import { getSettings } from '../settings/settings.service';

/**
 * Feed do Instagram via Instagram API (Graph API da Meta).
 *
 * Como conectar a conta real (resumo — detalhes no README):
 *  1. Converta o perfil da doceria em conta Profissional (Comercial ou Criador de conteúdo).
 *  2. Crie um app em https://developers.facebook.com com o produto "Instagram" (Instagram API with Instagram Login).
 *  3. Gere um token de longa duração (válido por 60 dias) e coloque em INSTAGRAM_ACCESS_TOKEN.
 *  4. O token é renovado automaticamente por esta classe (refresh_access_token) enquanto o site recebe visitas.
 *
 * Sem token, retornamos posts de exemplo para o layout funcionar.
 */

export interface InstagramPost {
  id: string;
  caption: string;
  mediaUrl: string;
  permalink: string;
  timestamp: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
}

const CACHE_MS = 30 * 60 * 1000;
let cache: { at: number; posts: InstagramPost[]; source: 'instagram' | 'mock' } | null = null;
let token = env.INSTAGRAM_ACCESS_TOKEN;
let lastRefresh = 0;

const MOCK_POSTS: Omit<InstagramPost, 'permalink'>[] = [
  ['photo-1578985545062-69928b1d9587', 'Bolo de chocolate com ganache e frutas vermelhas 🍫🍓 #rafaellacakes'],
  ['photo-1535141192574-5d4897c12636', 'Naked cake para um casamento no campo 💍🌿'],
  ['photo-1488477181946-6428a0291777', 'Tortinhas de frutas frescas saindo do forno ✨'],
  ['photo-1569864358642-9d1684040f43', 'Macarons coloridos para alegrar a semana 💗'],
  ['photo-1464349095431-e9a21285b5f3', 'Bolo de aniversário com flores de buttercream 🌸'],
  ['photo-1587314168485-3236d6710814', 'Cupcakes de baunilha com cobertura de cream cheese 🧁'],
  ['photo-1606890737304-57a1ca8a5b62', 'Mesa de doces finos para festa de 15 anos 🎀'],
  ['photo-1565958011703-44f9829ba187', 'Cheesecake de frutas vermelhas — um clássico da casa ❤️'],
].map(([photo, caption], i) => ({
  id: `mock-${i}`,
  caption,
  mediaUrl: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=600&h=600&q=80`,
  timestamp: new Date(Date.now() - i * 2 * 86_400_000).toISOString(),
  mediaType: 'IMAGE' as const,
}));

/** Posts de exemplo apontando para o perfil configurado no painel (Configurações → Instagram). */
async function mockPosts(limit = MOCK_POSTS.length): Promise<InstagramPost[]> {
  const { instagramHandle } = await getSettings();
  const permalink = instagramHandle ? `https://www.instagram.com/${instagramHandle}/` : 'https://www.instagram.com/';
  return MOCK_POSTS.slice(0, limit).map((p) => ({ ...p, permalink }));
}

/** Renova o token de longa duração no máximo 1x por dia. */
async function maybeRefreshToken() {
  if (!token || Date.now() - lastRefresh < 24 * 60 * 60 * 1000) return;
  lastRefresh = Date.now();
  try {
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
    );
    if (res.ok) {
      const data = (await res.json()) as { access_token?: string };
      if (data.access_token) token = data.access_token;
    }
  } catch {
    /* mantém o token atual */
  }
}

export async function getInstagramFeed(): Promise<{ posts: InstagramPost[]; source: 'instagram' | 'mock' }> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;

  // Sem token: exemplos, sem cache (assim uma troca do @ no painel aparece logo)
  if (!token) return { posts: await mockPosts(env.INSTAGRAM_POSTS_LIMIT), source: 'mock' };

  try {
    await maybeRefreshToken();
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=${fields}&limit=${env.INSTAGRAM_POSTS_LIMIT}&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) throw new Error(`Instagram respondeu ${res.status}`);
    const json = (await res.json()) as {
      data: {
        id: string;
        caption?: string;
        media_type: InstagramPost['mediaType'];
        media_url: string;
        thumbnail_url?: string;
        permalink: string;
        timestamp: string;
      }[];
    };
    const posts = json.data.map((p) => ({
      id: p.id,
      caption: p.caption ?? '',
      // Para vídeos usamos a miniatura
      mediaUrl: p.media_type === 'VIDEO' ? p.thumbnail_url ?? p.media_url : p.media_url,
      permalink: p.permalink,
      timestamp: p.timestamp,
      mediaType: p.media_type,
    }));
    cache = { at: Date.now(), posts, source: 'instagram' };
    return cache;
  } catch (error) {
    console.warn('[instagram] usando posts de exemplo:', (error as Error).message);
    // Se falhar, mantém o último cache real ou usa exemplos (por 5 min)
    if (cache?.source === 'instagram') return cache;
    cache = { at: Date.now() - CACHE_MS + 5 * 60 * 1000, posts: await mockPosts(), source: 'mock' };
    return cache;
  }
}
