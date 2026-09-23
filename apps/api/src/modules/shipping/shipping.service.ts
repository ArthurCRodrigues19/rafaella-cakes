import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { normalizeForCompare, onlyDigits, requiredText } from '../../utils/text';

export interface CepAddress {
  zipCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

/** Consulta o ViaCEP (gratuito, sem chave). Retorna null se o CEP não existir ou o serviço falhar. */
export async function lookupCep(cep: string): Promise<CepAddress | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return null;
    return {
      zipCode: digits,
      street: data.logradouro ?? '',
      neighborhood: data.bairro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    };
  } catch {
    return null;
  }
}

export interface ShippingQuote {
  deliverable: boolean;
  feeCents: number;
  zoneName: string | null;
  address: CepAddress | null;
}

/**
 * Frete por zonas configuráveis no painel: o CEP é comparado com as faixas de CEP
 * e o bairro (do ViaCEP ou informado) com a lista de bairros de cada zona.
 */
export async function quoteShipping(cep: string, neighborhoodHint?: string): Promise<ShippingQuote> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) throw AppError.badRequest('CEP inválido.');

  const [address, zones] = await Promise.all([
    lookupCep(digits),
    prisma.shippingZone.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
  ]);

  const neighborhood = normalizeForCompare(address?.neighborhood || neighborhoodHint || '');

  const zone = zones.find((z) => {
    const inRange = z.cepStart && z.cepEnd && digits >= z.cepStart && digits <= z.cepEnd;
    const inNeighborhoods =
      neighborhood.length > 0 && z.neighborhoods.some((n) => normalizeForCompare(n) === neighborhood);
    return inRange || inNeighborhoods;
  });

  return {
    deliverable: Boolean(zone),
    feeCents: zone?.feeCents ?? 0,
    zoneName: zone?.name ?? null,
    address,
  };
}

// ---------------- admin: zonas de entrega ----------------

const cepField = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? onlyDigits(v) : null))
  .refine((v) => v === null || v.length === 8, 'CEP deve ter 8 dígitos');

export const zoneInputSchema = z.object({
  name: requiredText(80, 'Nome'),
  feeCents: z.coerce.number().int().min(0).max(100_000),
  cepStart: cepField,
  cepEnd: cepField,
  neighborhoods: z
    .array(z.string().trim().min(1).max(80))
    .max(200)
    .default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const shippingZonesService = {
  list: () => prisma.shippingZone.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
  create: (input: unknown) => prisma.shippingZone.create({ data: zoneInputSchema.parse(input) }),
  update: (id: string, input: unknown) =>
    prisma.shippingZone.update({ where: { id }, data: zoneInputSchema.parse(input) }),
  remove: (id: string) => prisma.shippingZone.delete({ where: { id } }),
};
