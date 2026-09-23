import { Router } from 'express';
import { asyncHandler as h } from '../../utils/asyncHandler';
import { optionalAuth, requireAuth } from '../../middlewares/auth';
import { sensitiveLimiter } from '../../middlewares/rateLimit';
import { imageUpload } from '../../lib/storage';
import { customOrdersController as c } from './customOrders.controller';

export const customOrdersRoutes = Router();

customOrdersRoutes.post('/custom-orders', sensitiveLimiter, optionalAuth, imageUpload.single('referenceImage'), h(c.create));
customOrdersRoutes.get('/me/custom-orders', requireAuth, h(c.listMine));
customOrdersRoutes.post('/me/custom-orders/:id/accept', requireAuth, h(c.accept));
customOrdersRoutes.post('/me/custom-orders/:id/decline', requireAuth, h(c.decline));
