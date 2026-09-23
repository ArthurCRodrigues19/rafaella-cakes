import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { asyncHandler as h } from '../../utils/asyncHandler';
import { requireAdmin } from '../../middlewares/auth';
import { AppError } from '../../utils/AppError';
import { requiredText, optionalText } from '../../utils/text';
import { imageUpload, publicUrl } from '../../lib/storage';
import { adminCategoriesService, adminProductsService } from '../products/products.service';
import { ordersService } from '../orders/orders.service';
import { ordersRepository } from '../orders/orders.repository';
import { toOrderDTO } from '../orders/orders.dto';
import { customOrdersService } from '../customOrders/customOrders.service';
import { reviewsService } from '../reviews/reviews.service';
import { getSettings, updateSettings } from '../settings/settings.service';
import { shippingZonesService } from '../shipping/shipping.service';
import { dashboardService } from './dashboard.service';

/**
 * Painel administrativo. TODAS as rotas exigem usuário com papel ADMIN.
 */
export const adminRoutes = Router();
adminRoutes.use(requireAdmin);

// ---------------- dashboard e clientes ----------------
adminRoutes.get('/dashboard', h(async (_req, res) => res.json(await dashboardService.summary())));
adminRoutes.get(
  '/customers',
  h(async (req, res) => {
    const q = z.object({ q: z.string().trim().max(80).optional() }).parse(req.query).q;
    res.json(await dashboardService.customers(q));
  }),
);

// ---------------- upload de imagens ----------------
adminRoutes.post(
  '/uploads',
  imageUpload.single('file'),
  h(async (req, res) => {
    if (!req.file) throw AppError.badRequest('Selecione uma imagem.');
    res.status(201).json({ url: publicUrl(req.file.filename) });
  }),
);

// ---------------- produtos ----------------
adminRoutes.get('/products', h(async (req, res) => res.json(await adminProductsService.list(req.query))));
adminRoutes.get('/products/:id', h(async (req, res) => res.json(await adminProductsService.get(req.params.id))));
adminRoutes.post('/products', h(async (req, res) => res.status(201).json(await adminProductsService.create(req.body))));
adminRoutes.put('/products/:id', h(async (req, res) => res.json(await adminProductsService.update(req.params.id, req.body))));
adminRoutes.patch('/products/:id', h(async (req, res) => res.json(await adminProductsService.toggle(req.params.id, req.body))));
adminRoutes.delete(
  '/products/:id',
  h(async (req, res) => {
    await adminProductsService.remove(req.params.id);
    res.status(204).end();
  }),
);

// ---------------- categorias ----------------
adminRoutes.post('/categories', h(async (req, res) => res.status(201).json(await adminCategoriesService.create(req.body))));
adminRoutes.put('/categories/:id', h(async (req, res) => res.json(await adminCategoriesService.update(req.params.id, req.body))));
adminRoutes.delete(
  '/categories/:id',
  h(async (req, res) => {
    await adminCategoriesService.remove(req.params.id);
    res.status(204).end();
  }),
);

// ---------------- pedidos da loja ----------------
adminRoutes.get('/orders', h(async (req, res) => res.json(await ordersService.adminList(req.query))));
adminRoutes.get(
  '/orders/:id',
  h(async (req, res) => {
    const order = await ordersRepository.findDetail(req.params.id);
    if (!order) throw AppError.notFound('Pedido não encontrado.');
    res.json(toOrderDTO(order));
  }),
);
adminRoutes.patch(
  '/orders/:id/status',
  h(async (req, res) => res.json(await ordersService.adminUpdateStatus(req.params.id, req.body))),
);

// ---------------- encomendas personalizadas ----------------
adminRoutes.get('/custom-orders', h(async (req, res) => res.json(await customOrdersService.adminList(req.query))));
adminRoutes.get('/custom-orders/:id', h(async (req, res) => res.json(await customOrdersService.adminGet(req.params.id))));
adminRoutes.patch(
  '/custom-orders/:id',
  h(async (req, res) => res.json(await customOrdersService.adminUpdate(req.params.id, req.body))),
);

// ---------------- avaliações ----------------
adminRoutes.get(
  '/reviews',
  h(async (req, res) => res.json(await reviewsService.adminList(String(req.query.status ?? '')))),
);
adminRoutes.patch('/reviews/:id', h(async (req, res) => res.json(await reviewsService.adminUpdate(req.params.id, req.body))));
adminRoutes.delete(
  '/reviews/:id',
  h(async (req, res) => {
    await reviewsService.adminRemove(req.params.id);
    res.status(204).end();
  }),
);

// ---------------- configurações ----------------
adminRoutes.get('/settings', h(async (_req, res) => res.json(await getSettings())));
adminRoutes.put('/settings', h(async (req, res) => res.json(await updateSettings(req.body))));

// ---------------- zonas de entrega ----------------
adminRoutes.get('/shipping-zones', h(async (_req, res) => res.json(await shippingZonesService.list())));
adminRoutes.post('/shipping-zones', h(async (req, res) => res.status(201).json(await shippingZonesService.create(req.body))));
adminRoutes.put('/shipping-zones/:id', h(async (req, res) => res.json(await shippingZonesService.update(req.params.id, req.body))));
adminRoutes.delete(
  '/shipping-zones/:id',
  h(async (req, res) => {
    await shippingZonesService.remove(req.params.id);
    res.status(204).end();
  }),
);

// ---------------- galeria ----------------
const galleryInput = z.object({
  url: z
    .string()
    .trim()
    .max(500)
    .refine((u) => u.startsWith('/uploads/') || u.startsWith('https://'), 'URL de imagem inválida'),
  alt: requiredText(200, 'Texto alternativo'),
  caption: optionalText(200),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});
adminRoutes.post(
  '/gallery',
  h(async (req, res) => res.status(201).json(await prisma.galleryImage.create({ data: galleryInput.parse(req.body) }))),
);
adminRoutes.put(
  '/gallery/:id',
  h(async (req, res) =>
    res.json(await prisma.galleryImage.update({ where: { id: req.params.id }, data: galleryInput.parse(req.body) })),
  ),
);
adminRoutes.delete(
  '/gallery/:id',
  h(async (req, res) => {
    await prisma.galleryImage.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
