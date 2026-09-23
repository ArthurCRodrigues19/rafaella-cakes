/**
 * Cria um link público temporário (https://....trycloudflare.com) para o site local.
 * Uso: npm run tunnel   (com o site já rodando em outra janela: npm run demo)
 *
 * Procura o cloudflared no PATH ou em %LOCALAPPDATA%\Programs\cloudflared.
 * Para instalar: winget install Cloudflare.cloudflared
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const localInstall = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'Programs', 'cloudflared', 'cloudflared.exe')
  : null;
const bin = localInstall && existsSync(localInstall) ? localInstall : 'cloudflared';
const port = process.env.WEB_PORT || '3000';

console.log(`🌐 Abrindo túnel para http://localhost:${port} — procure o link "trycloudflare.com" abaixo.\n`);

const child = spawn(bin, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${port}`], { stdio: 'inherit' });

child.on('error', () => {
  console.error('\n❌ cloudflared não encontrado. Instale com:  winget install Cloudflare.cloudflared');
  process.exit(1);
});
child.on('exit', (code) => process.exit(code ?? 0));
