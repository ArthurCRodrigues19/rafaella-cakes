import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, paymentsMode } from './config/env';
import { UPLOAD_DIR } from './lib/storage';
import { globalLimiter } from './middlewares/rateLimit';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { authRoutes } from './modules/auth/auth.routes';
import { productsRoutes } from './modules/products/products.routes';
import { accountRoutes } from './modules/users/account.routes';
import { ordersRoutes } from './modules/orders/orders.routes';
import { customOrdersRoutes } from './modules/customOrders/customOrders.routes';
import { contentRoutes } from './modules/content/content.routes';
import { adminRoutes } from './modules/admin/admin.routes';

export function createApp() {
  const app = express();

  // O site (Next.js) repassa as chamadas /api para cá — confiamos em 1 proxy para obter o IP real
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Imagens de /uploads podem ser exibidas pelo site em outra porta
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cors({ origin: env.WEB_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  app.use(
    '/uploads',
    express.static(UPLOAD_DIR, {
      maxAge: '30d',
      immutable: true,
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  );

  app.get('/api/health', (_req, res) => res.json({ ok: true, payments: paymentsMode }));

  app.use('/api', globalLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', productsRoutes);
  app.use('/api', accountRoutes);
  app.use('/api', ordersRoutes);
  app.use('/api', customOrdersRoutes);
  app.use('/api', contentRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
