import type { Metadata } from 'next';
import { AuthCard, ResetPasswordForm } from '@/components/auth/AuthForms';

export const metadata: Metadata = { title: 'Nova senha', robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Crie uma nova senha">
      <ResetPasswordForm token={token ?? ''} />
    </AuthCard>
  );
}
