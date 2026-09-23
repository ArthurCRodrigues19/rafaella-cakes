/**
 * Busca dados públicos da API a partir dos Server Components (SSR/ISR).
 * Retorna null se a API estiver fora do ar, para a página renderizar mesmo assim.
 */
const API_URL = process.env.API_URL || 'http://localhost:4000';

export async function serverGet<T>(path: string, revalidate = 30): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
