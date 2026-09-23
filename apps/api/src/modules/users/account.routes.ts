import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler as h } from '../../utils/asyncHandler';
import { requireAuth } from '../../middlewares/auth';
import { AppError } from '../../utils/AppError';
import { requiredText, safeText } from '../../utils/text';
import { addressSchema } from './address.schema';
import { publicUserSelect } from './users.repository';
import { toPublicUser } from '../auth/auth.service';
import { toProductCard } from '../products/products.service';
import { productCardInclude } from '../products/products.repository';
import { cartItemsSchema, priceItems } from '../orders/pricing';
import { quoteShipping } from '../shipping/shipping.service';

/** Rotas da "Minha conta": perfil, endereços, favoritos e carrinho salvo. */
export const accountRoutes = Router();

// ---------------- CEP / frete (público) ----------------
accountRoutes.get(
  '/shipping/quote',
  h(async (req, res) => {
    const { cep, neighborhood } = z
      .object({ cep: z.string().max(12), neighborhood: z.string().max(80).optional() })
      .parse(req.query);
    res.json(await quoteShipping(cep, neighborhood));
  }),
);

accountRoutes.use('/me', requireAuth);

// ---------------- perfil ----------------
accountRoutes.patch(
  '/me',
  h(async (req, res) => {
    const data = z
      .object({ name: requiredText(100, 'Nome').optional(), phone: safeText(30).optional() })
      .parse(req.body);
    const user = await prisma.user.update({ where: { id: req.user!.id }, data, select: publicUserSelect });
    res.json({ user: toPublicUser(user) });
  }),
);

// ---------------- endereços ----------------
accountRoutes.get(
  '/me/addresses',
  h(async (req, res) => {
    res.json(
      await prisma.address.findMany({
        where: { userId: req.user!.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      }),
    );
  }),
);

accountRoutes.post(
  '/me/addresses',
  h(async (req, res) => {
    const data = addressSchema.parse(req.body);
    const userId = req.user!.id;
    const count = await prisma.address.count({ where: { userId } });
    if (count >= 10) throw AppError.badRequest('Você pode salvar até 10 endereços.');
    const isDefault = data.isDefault || count === 0;
    if (isDefault) await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    res.status(201).json(await prisma.address.create({ data: { ...data, isDefault, userId } }));
  }),
);

accountRoutes.put(
  '/me/addresses/:id',
  h(async (req, res) => {
    const data = addressSchema.parse(req.body);
    const userId = req.user!.id;
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw AppError.notFound('Endereço não encontrado.');
    if (data.isDefault) await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    res.json(await prisma.address.update({ where: { id: existing.id }, data }));
  }),
);

accountRoutes.delete(
  '/me/addresses/:id',
  h(async (req, res) => {
    await prisma.address.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
    res.status(204).end();
  }),
);

// ---------------- favoritos ----------------
accountRoutes.get(
  '/me/favorites',
  h(async (req, res) => {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user!.id, product: { isActive: true } },
      orderBy: { createdAt: 'desc' },
      include: { product: { include: productCardInclude } },
    });
    res.json(favorites.map((f) => toProductCard(f.product)));
  }),
);

accountRoutes.get(
  '/me/favorites/ids',
  h(async (req, res) => {
    const favorites = await prisma.favorite.findMany({ where: { userId: req.user!.id }, select: { productId: true } });
    res.json(favorites.map((f) => f.productId));
  }),
);

accountRoutes.post(
  '/me/favorites/:productId',
  h(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.productId }, select: { id: true } });
    if (!product) throw AppError.notFound('Produto não encontrado.');
    await prisma.favorite.upsert({
      where: { userId_productId: { userId: req.user!.id, productId: product.id } },
      create: { userId: req.user!.id, productId: product.id },
      update: {},
    });
    res.status(201).json({ ok: true });
  }),
);

accountRoutes.delete(
  '/me/favorites/:productId',
  h(async (req, res) => {
    await prisma.favorite.deleteMany({ where: { userId: req.user!.id, productId: req.params.productId } });
    res.status(204).end();
  }),
);

// ---------------- carrinho salvo (persistente entre dispositivos) ----------------
accountRoutes.get(
  '/me/cart',
  h(async (req, res) => {
    const items = await prisma.cartItem.findMany({ where: { userId: req.user!.id } });
    const priced = await priceItems(items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })));
    res.json(priced.lines);
  }),
);

accountRoutes.put(
  '/me/cart',
  h(async (req, res) => {
    const items = z.object({ items: cartItemsSchema }).parse(req.body).items;
    const userId = req.user!.id;
    const variantIds = [...new Set(items.map((i) => i.variantId))];
    const valid = await prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true } });
    const validIds = new Set(valid.map((v) => v.id));

    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { userId } }),
      prisma.cartItem.createMany({
        data: items
          .filter((i) => validIds.has(i.variantId))
          .reduce<{ userId: string; variantId: string; quantity: number }[]>((acc, i) => {
            const found = acc.find((a) => a.variantId === i.variantId);
            if (found) found.quantity += i.quantity;
            else acc.push({ userId, variantId: i.variantId, quantity: i.quantity });
            return acc;
          }, []),
      }),
    ]);
    res.json({ ok: true });
  }),
);
