import { env, paymentsMode } from './config/env';
import { createApp } from './app';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  console.log(`🎂 API Rafaella Cakes rodando em http://localhost:${env.API_PORT}`);
  console.log(
    paymentsMode === 'mock'
      ? '💳 Pagamentos em MODO DE DEMONSTRAÇÃO (configure MP_ACCESS_TOKEN para usar o Mercado Pago)'
      : '💳 Pagamentos via Mercado Pago',
  );
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
