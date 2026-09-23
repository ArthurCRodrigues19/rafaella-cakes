import type { Metadata } from 'next';
import { AuthCard, ForgotPasswordForm } from '@/components/auth/AuthForms';

export const metadata: Metadata = { title: 'Recuperar senha', robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Esqueceu a senha?" subtitle="Enviaremos um link para você criar uma nova.">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
