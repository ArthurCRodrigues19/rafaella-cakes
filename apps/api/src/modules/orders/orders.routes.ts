import { Router } from 'express';
import { asyncHandler as h } from '../../utils/asyncHandler';
import { requireAuth } from '../../middlewares/auth';
import { ordersController as c } from './orders.controller';

export const ordersRoutes = Router();

ordersRoutes.post('/cart/quote', h(c.quote));
ordersRoutes.get('/payments/config', c.paymentConfig);
ordersRoutes.post('/webhooks/mercadopago', h(c.webhook));

ordersRoutes.post('/orders', requireAuth, h(c.create));
ordersRoutes.get('/orders/:id', requireAuth, h(c.detail));
ordersRoutes.post('/orders/:id/pay', requireAuth, h(c.pay));
ordersRoutes.post('/orders/:id/simulate-payment', requireAuth, h(c.simulate));
ordersRoutes.get('/me/orders', requireAuth, h(c.listMine));
