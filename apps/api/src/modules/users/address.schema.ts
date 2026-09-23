import { z } from 'zod';
import { onlyDigits, optionalText, requiredText } from '../../utils/text';

export const addressSchema = z.object({
  label: requiredText(40, 'Identificação').default('Casa'),
  recipient: requiredText(100, 'Destinatário'),
  zipCode: z
    .string({ required_error: 'Informe o CEP' })
    .transform(onlyDigits)
    .refine((v) => v.length === 8, 'CEP deve ter 8 dígitos'),
  street: requiredText(160, 'Rua'),
  number: requiredText(20, 'Número'),
  complement: optionalText(80),
  neighborhood: requiredText(80, 'Bairro'),
  city: requiredText(80, 'Cidade'),
  state: z
    .string({ required_error: 'Informe o estado' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Use a sigla do estado (ex.: SP)'),
  reference: optionalText(160),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;
