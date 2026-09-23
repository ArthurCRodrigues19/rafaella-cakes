import { z } from 'zod';

/** Remove tags HTML e caracteres de controle — defesa em profundidade contra XSS. */
export function stripTags(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

/** Texto livre sanitizado com tamanho máximo. */
export const safeText = (max = 500) => z.string().trim().max(max).transform(stripTags);

/** Texto obrigatório (mínimo 1 caractere depois de sanitizar). */
export const requiredText = (max = 200, label = 'Campo') =>
  z
    .string({ required_error: `${label} é obrigatório` })
    .trim()
    .min(1, `${label} é obrigatório`)
    .max(max)
    .transform(stripTags);

/** Texto opcional: string vazia vira undefined. */
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .transform(stripTags)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Normaliza para comparação: sem acento, minúsculo, espaços simples. */
export function normalizeForCompare(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export const onlyDigits = (value: string) => value.replace(/\D/g, '');

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const formatOrderNumber = (code: number) => `RC${String(code).padStart(5, '0')}`;
export const formatCustomOrderNumber = (code: number) => `EN${String(code).padStart(5, '0')}`;

/** Escapa HTML para uso seguro em templates de e-mail. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
