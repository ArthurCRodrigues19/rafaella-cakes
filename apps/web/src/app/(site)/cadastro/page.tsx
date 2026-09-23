import type { Metadata } from 'next';
import { AuthCard, RegisterForm } from '@/components/auth/AuthForms';

export const metadata: Metadata = { title: 'Criar conta', robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthCard title="Crie sua conta" subtitle="Leva menos de um minuto.">
      <RegisterForm next={next} />
    </AuthCard>
  );
}
