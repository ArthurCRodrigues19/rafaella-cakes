import type { Metadata } from 'next';
import { AuthCard, LoginForm } from '@/components/auth/AuthForms';

export const metadata: Metadata = { title: 'Entrar', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const { next, erro } = await searchParams;
  return (
    <AuthCard title="Que bom te ver!" subtitle="Entre para acompanhar pedidos e encomendas.">
      <LoginForm next={next} oauthError={erro} />
    </AuthCard>
  );
}
