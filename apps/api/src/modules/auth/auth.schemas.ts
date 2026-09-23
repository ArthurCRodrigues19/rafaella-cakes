import { z } from 'zod';
import { requiredText, safeText } from '../../utils/text';

const email = z.string({ required_error: 'Informe o e-mail' }).trim().toLowerCase().email('E-mail inválido').max(160);

export const passwordSchema = z
  .string({ required_error: 'Informe a senha' })
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .max(128, 'Senha muito longa')
  .regex(/[A-Za-z]/, 'A senha deve ter ao menos uma letra')
  .regex(/\d/, 'A senha deve ter ao menos um número');

export const registerSchema = z.object({
  name: requiredText(100, 'Nome'),
  email,
  phone: safeText(30).optional(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email,
  password: z.string({ required_error: 'Informe a senha' }).min(1, 'Informe a senha').max(128),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});
