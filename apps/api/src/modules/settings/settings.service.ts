import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { safeText } from '../../utils/text';

/** Retorna a linha única de configurações, criando-a com valores padrão se não existir. */
export async function getSettings() {
  return prisma.storeSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export const updateSettingsSchema = z.object({
  storeName: safeText(80).optional(),
  phone: safeText(40).optional(),
  whatsapp: safeText(40).optional(),
  email: z.string().trim().email('E-mail inválido').or(z.literal('')).optional(),
  instagramHandle: safeText(60)
    .transform((v) => v.replace(/^@/, ''))
    .optional(),
  addressLine: safeText(200).optional(),
  city: safeText(80).optional(),
  mapQuery: safeText(200).optional(),
  openingHours: safeText(400).optional(),
  aboutText: safeText(3000).optional(),
  minLeadDays: z.coerce.number().int().min(0).max(60).optional(),
  customMinLeadDays: z.coerce.number().int().min(0).max(120).optional(),
  openWeekdays: z.array(z.coerce.number().int().min(0).max(6)).min(1, 'Escolha ao menos um dia').optional(),
  pickupEnabled: z.boolean().optional(),
  deliveryEnabled: z.boolean().optional(),
});

export async function updateSettings(input: unknown) {
  const data = updateSettingsSchema.parse(input);
  await getSettings();
  return prisma.storeSettings.update({ where: { id: 1 }, data });
}

/** Campos seguros para exibir no site público. */
export async function getPublicSettings() {
  const s = await getSettings();
  return {
    storeName: s.storeName,
    phone: s.phone,
    whatsapp: s.whatsapp,
    email: s.email,
    instagramHandle: s.instagramHandle,
    addressLine: s.addressLine,
    city: s.city,
    mapQuery: s.mapQuery,
    openingHours: s.openingHours,
    aboutText: s.aboutText,
    minLeadDays: s.minLeadDays,
    customMinLeadDays: s.customMinLeadDays,
    openWeekdays: s.openWeekdays,
    pickupEnabled: s.pickupEnabled,
    deliveryEnabled: s.deliveryEnabled,
  };
}
