import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { optionalText, requiredText, safeText, slugify } from '../../utils/text';
import { productsRepository, type ProductCard } from './products.repository';

// ------------------------------------------------------------------
// Público
// ------------------------------------------------------------------

export const listProductsQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().min(0).optional(), // em reais
  maxPrice: z.coerce.number().min(0).optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'newest', 'name']).default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

/** Formato enxuto de produto para cards (evita mandar dados desnecessários ao front). */
export function toProductCard(p: ProductCard) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    priceFromCents: p.priceFromCents,
    hasVariants: p.variants.length > 1,
    isFeatured: p.isFeatured,
    category: p.category,
    image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt } : null,
    // "Esgotado" quando todas as variações com estoque controlado estão zeradas
    soldOut: p.variants.length === 0 || p.variants.every((v) => v.stock !== null && v.stock <= 0),
  };
}

export const productsService = {
  async list(rawQuery: unknown) {
    const query = listProductsQuery.parse(rawQuery);
    const where: Prisma.ProductWhereInput = { isActive: true };

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { shortDescription: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { variants: { some: { flavor: { contains: query.q, mode: 'insensitive' } } } },
      ];
    }
    if (query.category) where.category = { slug: query.category };
    if (query.featured) where.isFeatured = true;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.priceFromCents = {
        gte: query.minPrice !== undefined ? Math.round(query.minPrice * 100) : undefined,
        lte: query.maxPrice !== undefined ? Math.round(query.maxPrice * 100) : undefined,
      };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput[] = {
      relevance: [{ isFeatured: 'desc' as const }, { createdAt: 'desc' as const }],
      price_asc: [{ priceFromCents: 'asc' as const }],
      price_desc: [{ priceFromCents: 'desc' as const }],
      newest: [{ createdAt: 'desc' as const }],
      name: [{ name: 'asc' as const }],
    }[query.sort];

    const { items, total } = await productsRepository.list(
      where,
      orderBy,
      (query.page - 1) * query.pageSize,
      query.pageSize,
    );

    return {
      items: items.map(toProductCard),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  },

  async getBySlug(slug: string) {
    const product = await productsRepository.findBySlug(slug);
    if (!product || !product.isActive) throw AppError.notFound('Produto não encontrado.');

    const [rating, reviews, related] = await Promise.all([
      productsRepository.ratingSummary(product.id),
      productsRepository.approvedReviews(product.id),
      productsRepository.related(product.categoryId, product.id),
    ]);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      priceFromCents: product.priceFromCents,
      leadTimeDays: product.leadTimeDays,
      category: product.category,
      images: product.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        size: v.size,
        flavor: v.flavor,
        priceCents: v.priceCents,
        stock: v.stock,
        available: v.stock === null || v.stock > 0,
      })),
      rating,
      reviews,
      related: related.map(toProductCard),
    };
  },

  listCategories: () =>
    prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    }),
};

// ------------------------------------------------------------------
// Administração
// ------------------------------------------------------------------

/** Inteiro opcional: "", null e undefined viram null. */
const nullableInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().int().min(min).max(max).nullable(),
  );

const variantInput = z.object({
  id: z.string().optional(),
  name: requiredText(100, 'Nome da variação'),
  size: optionalText(60),
  flavor: optionalText(80),
  priceCents: z.coerce.number().int().min(0, 'Preço inválido').max(10_000_000),
  // Vazio/nulo = produzido sob demanda (sem controle de estoque)
  stock: nullableInt(0, 100_000),
  isActive: z.boolean().default(true),
});

const imageInput = z.object({
  url: z
    .string()
    .trim()
    .max(500)
    .refine((u) => u.startsWith('/uploads/') || /^https:\/\//.test(u), 'URL de imagem inválida'),
  alt: requiredText(200, 'Texto alternativo'),
});

export const productInputSchema = z.object({
  name: requiredText(120, 'Nome'),
  slug: z.string().trim().max(80).optional(),
  categoryId: z.string({ required_error: 'Escolha a categoria' }).min(1, 'Escolha a categoria'),
  shortDescription: optionalText(200),
  description: safeText(5000).default(''),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  leadTimeDays: nullableInt(0, 60),
  variants: z.array(variantInput).min(1, 'Cadastre ao menos uma variação (tamanho/sabor)'),
  images: z.array(imageInput).max(12).default([]),
});

async function uniqueSlug(base: string, exceptId?: string) {
  const root = slugify(base) || 'produto';
  let slug = root;
  for (let i = 2; await productsRepository.slugExists(slug, exceptId); i++) slug = `${root}-${i}`;
  return slug;
}

function minPrice(variants: { priceCents: number; isActive: boolean }[]) {
  const active = variants.filter((v) => v.isActive);
  const list = active.length ? active : variants;
  return Math.min(...list.map((v) => v.priceCents));
}

export const adminProductsService = {
  async list(rawQuery: unknown) {
    const q = z
      .object({ q: z.string().trim().max(80).optional(), category: z.string().optional() })
      .parse(rawQuery);
    return prisma.product.findMany({
      where: {
        name: q.q ? { contains: q.q, mode: 'insensitive' } : undefined,
        categoryId: q.category || undefined,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        variants: { select: { id: true, stock: true, isActive: true } },
      },
    });
  },

  async get(id: string) {
    const product = await productsRepository.findByIdAdmin(id);
    if (!product) throw AppError.notFound('Produto não encontrado.');
    return product;
  },

  async create(input: unknown) {
    const data = productInputSchema.parse(input);
    const slug = await uniqueSlug(data.slug || data.name);
    return prisma.product.create({
      data: {
        name: data.name,
        slug,
        categoryId: data.categoryId,
        shortDescription: data.shortDescription,
        description: data.description,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        leadTimeDays: data.leadTimeDays,
        priceFromCents: minPrice(data.variants),
        variants: {
          create: data.variants.map(({ id: _id, ...v }, index) => ({ ...v, sortOrder: index })),
        },
        images: { create: data.images.map((img, index) => ({ ...img, sortOrder: index })) },
      },
      include: productsRepositoryIncludes(),
    });
  },

  async update(id: string, input: unknown) {
    const data = productInputSchema.parse(input);
    const existing = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
    if (!existing) throw AppError.notFound('Produto não encontrado.');

    const slug = data.slug && data.slug !== existing.slug ? await uniqueSlug(data.slug, id) : existing.slug;
    const keepIds = new Set(data.variants.filter((v) => v.id).map((v) => v.id!));
    const existingIds = new Set(existing.variants.map((v) => v.id));

    await prisma.$transaction(async (tx) => {
      // Variações removidas no formulário
      await tx.productVariant.deleteMany({ where: { productId: id, id: { notIn: [...keepIds] } } });

      for (const [index, { id: variantId, ...v }] of data.variants.entries()) {
        if (variantId && existingIds.has(variantId)) {
          await tx.productVariant.update({ where: { id: variantId }, data: { ...v, sortOrder: index } });
        } else {
          await tx.productVariant.create({ data: { ...v, sortOrder: index, productId: id } });
        }
      }

      // Imagens: substitui a lista inteira, mantendo a ordem enviada
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (data.images.length) {
        await tx.productImage.createMany({
          data: data.images.map((img, index) => ({ ...img, sortOrder: index, productId: id })),
        });
      }

      await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          slug,
          categoryId: data.categoryId,
          shortDescription: data.shortDescription,
          description: data.description,
          isActive: data.isActive,
          isFeatured: data.isFeatured,
          leadTimeDays: data.leadTimeDays,
          priceFromCents: minPrice(data.variants),
        },
      });
    });

    return this.get(id);
  },

  async remove(id: string) {
    await prisma.product.delete({ where: { id } });
  },

  async toggle(id: string, input: unknown) {
    const data = z.object({ isActive: z.boolean().optional(), isFeatured: z.boolean().optional() }).parse(input);
    return prisma.product.update({ where: { id }, data });
  },
};

function productsRepositoryIncludes() {
  return {
    category: { select: { id: true, name: true, slug: true } },
    images: { orderBy: { sortOrder: 'asc' as const } },
    variants: { orderBy: { sortOrder: 'asc' as const } },
  };
}

// ------------------------------------------------------------------
// Categorias (admin)
// ------------------------------------------------------------------

export const categoryInputSchema = z.object({
  name: requiredText(80, 'Nome'),
  description: optionalText(300),
  imageUrl: optionalText(500),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const adminCategoriesService = {
  async create(input: unknown) {
    const data = categoryInputSchema.parse(input);
    return prisma.category.create({ data: { ...data, slug: slugify(data.name) } });
  },
  async update(id: string, input: unknown) {
    const data = categoryInputSchema.parse(input);
    return prisma.category.update({ where: { id }, data: { ...data, slug: slugify(data.name) } });
  },
  async remove(id: string) {
    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) throw AppError.conflict('Esta categoria possui produtos. Mova-os antes de excluir.');
    await prisma.category.delete({ where: { id } });
  },
};
