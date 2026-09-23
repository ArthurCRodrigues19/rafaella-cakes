import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { earliestDate } from '../../utils/dates';
import { getSettings } from '../settings/settings.service';
import { quoteShipping, type ShippingQuote } from '../shipping/shipping.service';

/**
 * Precificação do carrinho SEMPRE feita no servidor, a partir do banco.
 * O preço que vem do navegador é ignorado — o cliente não consegue "editar" o valor.
 */

export const cartItemsSchema = z
  .array(
    z.object({
      variantId: z.string().min(1).max(40),
      quantity: z.coerce.number().int().min(1, 'Quantidade mínima é 1').max(50, 'Quantidade máxima é 50'),
    }),
  )
  .max(50);

export type CartItemInput = z.infer<typeof cartItemsSchema>[number];

export interface PricedLine {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  imageUrl: string | null;
  imageAlt: string | null;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
  stock: number | null;
  leadTimeDays: number | null;
}

export interface LineProblem {
  variantId: string;
  message: string;
}

export async function priceItems(items: CartItemInput[]) {
  // Junta itens repetidos
  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.variantId, (merged.get(i.variantId) ?? 0) + i.quantity);

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: [...merged.keys()] } },
    include: { product: { include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const lines: PricedLine[] = [];
  const problems: LineProblem[] = [];

  for (const [variantId, quantity] of merged) {
    const v = byId.get(variantId);
    if (!v || !v.isActive || !v.product.isActive) {
      problems.push({ variantId, message: 'Este item não está mais disponível e foi removido.' });
      continue;
    }
    if (v.stock !== null && v.stock < quantity) {
      problems.push({
        variantId,
        message: v.stock <= 0 ? `${v.product.name} está esgotado.` : `Temos apenas ${v.stock} unidade(s) de ${v.product.name}.`,
      });
    }
    lines.push({
      variantId,
      productId: v.productId,
      productSlug: v.product.slug,
      productName: v.product.name,
      variantName: v.name,
      imageUrl: v.product.images[0]?.url ?? null,
      imageAlt: v.product.images[0]?.alt ?? null,
      unitPriceCents: v.priceCents,
      quantity,
      totalCents: v.priceCents * quantity,
      stock: v.stock,
      leadTimeDays: v.product.leadTimeDays,
    });
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
  return { lines, problems, subtotalCents };
}

/** Prazo mínimo do carrinho = maior prazo entre o padrão da loja e o de cada produto. */
export async function deliveryWindow(lines: Pick<PricedLine, 'leadTimeDays'>[]) {
  const settings = await getSettings();
  const leadDays = Math.max(settings.minLeadDays, ...lines.map((l) => l.leadTimeDays ?? 0));
  return {
    settings,
    leadDays,
    earliestDate: earliestDate(leadDays, settings.openWeekdays),
    openWeekdays: settings.openWeekdays,
  };
}

export const quoteSchema = z.object({
  items: cartItemsSchema,
  fulfillmentType: z.enum(['DELIVERY', 'PICKUP']).default('PICKUP'),
  zipCode: z.string().max(12).optional(),
  neighborhood: z.string().max(80).optional(),
});

/** Resumo do carrinho: itens com preço real, prazos e frete. */
export async function quoteCart(input: unknown) {
  const data = quoteSchema.parse(input);
  const priced = await priceItems(data.items);
  const window = await deliveryWindow(priced.lines);

  let shipping: ShippingQuote | null = null;
  if (data.fulfillmentType === 'DELIVERY' && data.zipCode) {
    shipping = await quoteShipping(data.zipCode, data.neighborhood);
  }
  const shippingCents = data.fulfillmentType === 'DELIVERY' && shipping?.deliverable ? shipping.feeCents : 0;

  return {
    lines: priced.lines,
    problems: priced.problems,
    subtotalCents: priced.subtotalCents,
    shipping,
    shippingCents,
    totalCents: priced.subtotalCents + shippingCents,
    leadDays: window.leadDays,
    earliestDate: window.earliestDate,
    openWeekdays: window.openWeekdays,
    pickupEnabled: window.settings.pickupEnabled,
    deliveryEnabled: window.settings.deliveryEnabled,
  };
}
