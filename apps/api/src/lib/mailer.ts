import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

interface MailInput {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Envia e-mail sem derrubar a requisição se o SMTP estiver fora do ar:
 * o erro é registrado no log e o fluxo do pedido continua.
 */
export async function sendMail({ to, subject, html, replyTo }: MailInput): Promise<void> {
  if (!to) return;
  try {
    await transporter.sendMail({ from: env.MAIL_FROM, to, subject, html, replyTo });
  } catch (error) {
    console.warn(`[mailer] Falha ao enviar "${subject}" para ${to}:`, (error as Error).message);
  }
}

/** Dispara sem aguardar (para não atrasar a resposta HTTP). */
export function sendMailInBackground(input: MailInput) {
  void sendMail(input);
}
