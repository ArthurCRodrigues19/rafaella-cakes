import { Router } from 'express';
import { asyncHandler as h } from '../../utils/asyncHandler';
import { optionalAuth, requireAuth } from '../../middlewares/auth';
import { loginLimiter, sensitiveLimiter } from '../../middlewares/rateLimit';
import { authController as c } from './auth.controller';

export const authRoutes = Router();

authRoutes.post('/register', sensitiveLimiter, h(c.register));
authRoutes.post('/login', loginLimiter, h(c.login));
authRoutes.post('/admin/login', loginLimiter, h(c.adminLogin));
authRoutes.post('/logout', h(c.logout));
authRoutes.get('/me', optionalAuth, h(c.me));
authRoutes.post('/forgot-password', sensitiveLimiter, h(c.forgotPassword));
authRoutes.post('/reset-password', sensitiveLimiter, h(c.resetPassword));
authRoutes.post('/change-password', requireAuth, loginLimiter, h(c.changePassword));
authRoutes.get('/providers', c.providers);
authRoutes.get('/google', c.googleStart);
authRoutes.get('/google/callback', h(c.googleCallback));
