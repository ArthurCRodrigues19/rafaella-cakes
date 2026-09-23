import Link from 'next/link';
import { serverGet } from '@/lib/server-api';
import { getStoreSettings } from '@/lib/settings';
import type { Category, Paginated, ProductCard as ProductCardType, Testimonial } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';
import { SafeImage } from '@/components/SafeImage';
import { SectionHeading } from '@/components/ui';
import { Testimonials } from '@/components/home/Testimonials';
import { InstagramFeed } from '@/components/home/InstagramFeed';
import { CakeIcon, ChevronRightIcon, SparkleIcon, TruckIcon } from '@/components/icons';

const hero = 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&w=1400&q=80';
const about = 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=1000&q=80';
const custom = 'https://images.unsplash.com/photo-1542826438-bd32f43d626f?auto=format&fit=crop&w=1000&q=80';

export default async function HomePage() {
  const [featured, categories, testimonials, settings] = await Promise.all([
    serverGet<Paginated<ProductCardType>>('/products?featured=true&pageSize=8'),
    serverGet<Category[]>('/categories'),
    serverGet<Testimonial[]>('/testimonials'),
    getStoreSettings(),
  ]);

  // Dados estruturados para o Google (rich results de negócio local)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    name: settings.storeName,
    telephone: settings.phone,
    email: settings.email,
    address: { '@type': 'PostalAddress', streetAddress: settings.addressLine, addressLocality: settings.city, addressCountry: 'BR' },
    url: process.env.NEXT_PUBLIC_SITE_URL,
    servesCuisine: 'Confeitaria',
    sameAs: settings.instagramHandle ? [`https://instagram.com/${settings.instagramHandle}`] : [],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-paper">
        <div className="container-page grid items-center gap-10 py-12 md:grid-cols-2 md:py-20 lg:gap-16">
          <div className="animate-fade-up">
            <p className="eyebrow mb-5">Doceria artesanal</p>
            <h1 className="heading-xl text-balance">
              Doces feitos à mão para{' '}
              <span className="font-script text-[1.2em] font-normal text-blush-600">momentos</span> que merecem ser lembrados
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-cocoa-500">
              Bolos, doces finos e tortas com ingredientes selecionados, preparados com calma e carinho — do jeitinho da Rafaella.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/produtos" className="btn-primary">
                Ver o cardápio <ChevronRightIcon width={16} />
              </Link>
              <Link href="/encomendas" className="btn-outline">
                Encomendar para um evento
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-blush-200 pt-6 text-center sm:text-left">
              {[
                ['100%', 'artesanal'],
                ['+2 mil', 'festas adoçadas'],
                ['5★', 'avaliação média'],
              ].map(([n, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-serif text-2xl text-cocoa-800">{n}</dd>
                  <dd className="text-xs text-cocoa-400">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-md md:max-w-none">
            <div className="absolute -right-6 -top-6 h-full w-full rounded-[3rem] bg-blush-200" aria-hidden />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[3rem] shadow-soft">
              <SafeImage src={hero} alt="Naked cake decorado com frutas vermelhas e flores" fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-6 -left-4 rounded-3xl bg-white px-5 py-4 shadow-soft sm:-left-8">
              <p className="font-script text-2xl text-blush-600">feito com amor</p>
              <p className="text-xs text-cocoa-400">desde a primeira fatia</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Diferenciais ---------------- */}
      <section className="border-y border-blush-100 bg-white">
        <div className="container-page grid gap-6 py-8 sm:grid-cols-3">
          {[
            { icon: CakeIcon, title: 'Receitas artesanais', text: 'Manteiga de verdade, chocolate belga e frutas frescas.' },
            { icon: SparkleIcon, title: 'Personalizado pra você', text: 'Criamos o bolo dos seus sonhos para qualquer ocasião.' },
            { icon: TruckIcon, title: 'Entrega ou retirada', text: 'Agende a data e receba com todo cuidado.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-4">
              <span className="rounded-2xl bg-blush-100 p-3 text-blush-600">
                <Icon width={22} height={22} />
              </span>
              <div>
                <h2 className="font-serif text-lg">{title}</h2>
                <p className="text-sm text-cocoa-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Categorias ---------------- */}
      {categories && categories.length > 0 && (
        <section className="container-page pt-20" aria-labelledby="categorias-title">
          <SectionHeading eyebrow="Cardápio" title={<span id="categorias-title">Escolha sua delícia</span>} />
          <ul className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
            {categories.map((c) => (
              <li key={c.id} className="w-36 shrink-0 snap-start sm:w-auto">
                <Link href={`/produtos?category=${c.slug}`} className="group block text-center">
                  <span className="relative mx-auto block aspect-square overflow-hidden rounded-full border-4 border-white bg-blush-100 shadow-card">
                    <SafeImage src={c.imageUrl} alt={c.name} fill sizes="160px" className="object-cover transition duration-500 group-hover:scale-110" />
                  </span>
                  <span className="mt-3 block font-serif text-lg text-cocoa-700 group-hover:text-blush-600">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------------- Destaques ---------------- */}
      <section className="container-page py-20" aria-labelledby="destaques-title">
        <SectionHeading
          eyebrow="Os queridinhos"
          title={<span id="destaques-title">Favoritos da casa</span>}
          subtitle="Os doces que mais saem por aqui — e que já viraram tradição nas festas dos nossos clientes."
        />
        {featured && featured.items.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {featured.items.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 2} />
            ))}
          </div>
        ) : (
          <p className="text-center text-cocoa-400">Nosso cardápio está sendo atualizado. Volte em instantes!</p>
        )}
        <div className="mt-12 text-center">
          <Link href="/produtos" className="btn-outline">
            Ver cardápio completo
          </Link>
        </div>
      </section>

      {/* ---------------- Encomendas ---------------- */}
      <section className="bg-blush-100">
        <div className="container-page grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="relative order-last aspect-[4/3] overflow-hidden rounded-4xl shadow-soft md:order-first">
            <SafeImage src={custom} alt="Bolo de casamento decorado com flores naturais" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          </div>
          <div>
            <p className="eyebrow mb-4">Encomendas personalizadas</p>
            <h2 className="heading-lg text-balance">Aniversário, casamento, chá de bebê? Vamos criar o bolo perfeito para você.</h2>
            <p className="mt-5 leading-relaxed text-cocoa-600">
              Conte como você imagina a sua festa: sabores, cores, tema e número de convidados. A Rafaella prepara um orçamento
              personalizado e você acompanha tudo pela sua conta.
            </p>
            <ol className="mt-8 space-y-4">
              {['Envie os detalhes e uma foto de referência', 'Receba o orçamento por e-mail', 'Aprove, pague online e é só esperar a festa!'].map(
                (step, i) => (
                  <li key={step} className="flex items-center gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white font-serif text-cocoa-700 shadow-card">{i + 1}</span>
                    <span className="text-cocoa-700">{step}</span>
                  </li>
                ),
              )}
            </ol>
            <Link href="/encomendas" className="btn-primary mt-10">
              Solicitar orçamento
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- Sobre ---------------- */}
      <section id="sobre" className="container-page scroll-mt-28 py-20 md:py-28" aria-labelledby="sobre-title">
        <div className="grid items-center gap-12 md:grid-cols-5">
          <div className="md:col-span-3">
            <p className="eyebrow mb-4">Sobre a Rafaella</p>
            <h2 id="sobre-title" className="heading-lg">
              Uma cozinha de família, <span className="font-script text-[1.2em] font-normal text-blush-600">receitas de coração</span>
            </h2>
            <div className="prose-soft mt-6 text-lg">
              <p>
                {settings.aboutText ||
                  'A Rafaella Cakes nasceu na cozinha de casa, entre receitas de família e muita vontade de transformar momentos especiais em memórias doces.'}
              </p>
              <p>
                Aqui nada é industrializado: cada massa é batida, cada recheio é cozido e cada flor de buttercream é feita à mão.
                Trabalhamos sob encomenda, para que tudo chegue fresquinho até você.
              </p>
            </div>
            <p className="mt-6 font-script text-4xl text-cocoa-600">Com carinho, Rafaella</p>
          </div>
          <div className="relative md:col-span-2">
            <div className="relative aspect-[3/4] overflow-hidden rounded-t-full shadow-soft">
              <SafeImage src={about} alt="Bolo de aniversário decorado artesanalmente" fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Depoimentos ---------------- */}
      {testimonials && testimonials.length > 0 && (
        <section className="bg-paper py-20" aria-labelledby="depoimentos-title">
          <div className="container-page">
            <SectionHeading eyebrow="Depoimentos" title={<span id="depoimentos-title">Quem prova, conta</span>} />
            <Testimonials items={testimonials} />
          </div>
        </section>
      )}

      {/* ---------------- Instagram ---------------- */}
      <InstagramFeed handle={settings.instagramHandle} />
    </>
  );
}
