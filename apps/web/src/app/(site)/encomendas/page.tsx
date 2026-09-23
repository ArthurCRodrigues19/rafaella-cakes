import type { Metadata } from 'next';
import { getStoreSettings } from '@/lib/settings';
import { CustomOrderForm } from '@/components/custom/CustomOrderForm';
import { SafeImage } from '@/components/SafeImage';

export const metadata: Metadata = {
  title: 'Encomendas personalizadas',
  description:
    'Bolos e doces personalizados para aniversários, casamentos, chás e festas. Solicite um orçamento com data, sabores, tema e foto de referência.',
  alternates: { canonical: '/encomendas' },
};

export default async function CustomOrdersPage() {
  const settings = await getStoreSettings();

  return (
    <>
      <section className="bg-paper">
        <div className="container-page grid items-center gap-10 py-12 md:grid-cols-2 md:py-16">
          <div>
            <p className="eyebrow mb-4">Sob encomenda</p>
            <h1 className="heading-xl text-balance">
              O bolo <span className="font-script text-[1.15em] font-normal text-blush-600">dos seus sonhos</span>, do seu jeito
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-cocoa-500">
              Preencha os detalhes abaixo e receba um orçamento personalizado. Pedimos no mínimo{' '}
              <strong>{settings.customMinLeadDays} dias</strong> de antecedência para encomendas especiais.
            </p>
          </div>
          <div className="relative hidden aspect-[5/4] overflow-hidden rounded-4xl shadow-soft md:block">
            <SafeImage
              src="https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=1000&q=80"
              alt="Bolo decorado para festa de aniversário"
              fill
              priority
              sizes="50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>
      <div className="container-page -mt-4 py-10">
        <CustomOrderForm minLeadDays={settings.customMinLeadDays} />
      </div>
    </>
  );
}
