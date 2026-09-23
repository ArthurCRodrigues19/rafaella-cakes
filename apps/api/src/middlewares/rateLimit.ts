import rateLimit from 'express-rate-limit';

const message = (text: string) => ({ error: { message: text, code: 'RATE_LIMITED' } });

/** Limite geral por IP. */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Muitas requisições. Aguarde um momento.'),
});

/** Login: protege contra força bruta. Só conta tentativas que falharam. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Muitas tentativas de login. Tente novamente em 15 minutos.'),
});

/** Cadastro, recuperação de senha, contato e encomendas. */
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Limite de envios atingido. Tente novamente mais tarde.'),
});
