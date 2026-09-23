import { Router } from 'express';
import { asyncHandler as h } from '../../utils/asyncHandler';
import { requireAuth } from '../../middlewares/auth';
import { productsService } from './products.service';
import { reviewsService } from '../reviews/reviews.service';

export const productsRoutes = Router();

productsRoutes.get(
  '/categories',
  h(async (_req, res) => {
    const categories = await productsService.listCategories();
    res.json(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        productCount: c._count.products,
      })),
    );
  }),
);

productsRoutes.get(
  '/products',
  h(async (req, res) => {
    res.json(await productsService.list(req.query));
  }),
);

productsRoutes.get(
  '/products/:slug',
  h(async (req, res) => {
    res.json(await productsService.getBySlug(req.params.slug));
  }),
);

productsRoutes.post(
  '/products/:slug/reviews',
  requireAuth,
  h(async (req, res) => {
    await reviewsService.upsert(req.user!, req.params.slug, req.body);
    res.status(201).json({ message: 'Obrigada pela avaliação! Ela aparecerá no site após a aprovação.' });
  }),
);

productsRoutes.get(
  '/testimonials',
  h(async (_req, res) => {
    res.json(await reviewsService.testimonials(9));
  }),
);
