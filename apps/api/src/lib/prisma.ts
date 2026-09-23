import { PrismaClient } from '@prisma/client';
import { isProd } from '../config/env';

// Uma única instância do Prisma para toda a aplicação.
// O Prisma usa queries parametrizadas, o que protege contra SQL injection.
export const prisma = new PrismaClient({
  log: isProd ? ['error'] : ['warn', 'error'],
});
