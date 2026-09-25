import { serverGet } from './server-api';
import type { StoreSettings } from './types';

/** Valores usados se a API estiver indisponível. */
export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'Rafaella Cakes',
  phone: '(11) 3456-7890',
  whatsapp: '5511987654321',
  email: 'contato@rafaellacakes.com.br',
  instagramHandle: 'https_rafaellarib',
  addressLine: 'Rua das Flores, 123 — Vila Madalena',
  city: 'São Paulo — SP',
  mapQuery: 'Vila Madalena, São Paulo - SP',
  openingHours: 'Terça a sexta: 9h às 19h\nSábado: 9h às 15h',
  aboutText: '',
  minLeadDays: 2,
  customMinLeadDays: 7,
  openWeekdays: [2, 3, 4, 5, 6],
  pickupEnabled: true,
  deliveryEnabled: true,
};

export async function getStoreSettings(): Promise<StoreSettings> {
  return (await serverGet<StoreSettings>('/settings', 60)) ?? DEFAULT_SETTINGS;
}
