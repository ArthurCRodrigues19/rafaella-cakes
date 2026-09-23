import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { asyncHandler as h } from '../../utils/asyncHandler';
import { sensitiveLimiter } from '../../middlewares/rateLimit';
import { optionalText, requiredText } from '../../utils/text';
import { sendMailInBackground } from '../../lib/mailer';
import { contactEmail } from '../../lib/emailTemplates';
import { getPublicSettings, getSettings } from '../settings/settings.service';
import { getInstagramFeed } from './instagram.service';

/** Conteúdo público do site: configurações, galeria, Instagram e contato. */
export const contentRoutes = Router();

contentRoutes.get(
  '/settings',
  h(async (_req, res) => {
    res.json(await getPublicSettings());
  }),
);

contentRoutes.get(
  '/gallery',
  h(async (_req, res) => {
    res.json(await prisma.galleryImage.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }));
  }),
);

contentRoutes.get(
  '/instagram',
  h(async (_req, res) => {
    res.json(await getInstagramFeed());
  }),
);

contentRoutes.post(
  '/contact',
  sensitiveLimiter,
  h(async (req, res) => {
    const data = z
      .object({
        name: requiredText(100, 'Nome'),
        email: z.string().trim().email('E-mail inválido').max(160),
        phone: optionalText(30),
        message: requiredText(3000, 'Mensagem'),
        // Campo "isca" invisível: robôs costumam preenchê-lo
        website: z.string().max(0, 'Spam detectado').optional(),
      })
      .parse(req.body);
    const settings = await getSettings();
    const to = env.STORE_NOTIFY_EMAIL || settings.email;
    sendMailInBackground({ to, replyTo: data.email, ...contactEmail(data) });
    res.json({ message: 'Mensagem enviada! Responderemos o quanto antes. 💕' });
  }),
);
