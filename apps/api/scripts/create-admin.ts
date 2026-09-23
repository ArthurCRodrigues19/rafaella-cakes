/**
 * Cria (ou promove) um usuário ADMIN.
 *
 * Uso (na raiz do projeto):
 *   npm run admin:create -- --email pessoa@exemplo.com --name "Nome" [--password "Senha123"]
 *
 * - Se o e-mail já existir, o usuário é promovido a ADMIN e a senha é redefinida.
 * - Sem --password, uma senha forte é gerada e exibida no terminal.
 */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function generatePassword(): string {
  // Sem caracteres ambíguos (0/O, 1/l/I) para facilitar a digitação
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const body = Array.from(crypto.randomBytes(10), (b) => chars[b % chars.length]).join('');
  return `${body}@${crypto.randomInt(10, 99)}`;
}

async function main() {
  const email = arg('email')?.trim().toLowerCase();
  const name = arg('name')?.trim() || 'Administrador';
  const password = arg('password') || generatePassword();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('❌ Informe um e-mail válido: npm run admin:create -- --email pessoa@exemplo.com --name "Nome"');
    process.exit(1);
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    console.error('❌ A senha precisa ter 8+ caracteres, com letras e números.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });

  const user = existing
    ? await prisma.user.update({
        where: { email },
        // tokenVersion++ encerra sessões antigas desse usuário
        data: { role: 'ADMIN', passwordHash, name: arg('name') ? name : existing.name, tokenVersion: { increment: 1 } },
      })
    : await prisma.user.create({ data: { email, name, role: 'ADMIN', passwordHash } });

  console.log(`\n✅ Administrador ${existing ? 'atualizado' : 'criado'} com sucesso!`);
  console.log(`   Nome:   ${user.name}`);
  console.log(`   E-mail: ${user.email}`);
  console.log(`   Senha:  ${password}`);
  console.log('   Painel: http://localhost:3000/admin/login\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
