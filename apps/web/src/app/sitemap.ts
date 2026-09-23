import type { MetadataRoute } from 'next';
import { serverGet } from '@/lib/server-api';
import type { Paginated, ProductCard } from '@/lib/types';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await serverGet<Paginated<ProductCard>>('/products?pageSize=48', 3600);
  const staticPages = ['', '/produtos', '/encomendas', '/galeria', '/contato'].map((p) => ({
    url: `${siteUrl}${p}`,
    changeFrequency: 'weekly' as const,
    priority: p === '' ? 1 : 0.8,
  }));
  return [
    ...staticPages,
    ...(products?.items ?? []).map((p) => ({
      url: `${siteUrl}/produtos/${p.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
