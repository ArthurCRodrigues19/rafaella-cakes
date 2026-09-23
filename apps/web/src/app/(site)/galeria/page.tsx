import type { Metadata } from 'next';
import Link from 'next/link';
import { serverGet } from '@/lib/server-api';
import type { GalleryImage, Testimonial } from '@/lib/types';
import { SafeImage } from '@/components/SafeImage';
import { SectionHeading } from '@/components/ui';
import { Testimonials } from '@/components/home/Testimonials';

export const metadata: Metadata = {
  title: 'Galeria e depoimentos',
  description: 'Veja bolos, doces e festas que já adoçamos — e o que nossos clientes dizem sobre a Rafaella Cakes.',
  alternates: { canonical: '/galeria' },
};

export default async function GalleryPage() {
  const [images, testimonials] = await Promise.all([
    serverGet<GalleryImage[]>('/gallery', 60),
    serverGet<Testimonial[]>('/testimonials', 60),
  ]);

  return (
    <div className="container-page py-12 md:py-16">
      <SectionHeading as="h1" eyebrow="Galeria" title="Momentos que ajudamos a adoçar" subtitle="Um pouquinho das encomendas que saíram da nossa cozinha." />

      {images && images.length > 0 ? (
        // Layout "masonry" com colunas CSS (leve, sem JavaScript)
        <ul className="columns-2 gap-4 space-y-4 md:columns-3">
          {images.map((img, i) => (
            <li key={img.id} className="break-inside-avoid">
              <figure className="group relative overflow-hidden rounded-3xl bg-blush-100">
                <SafeImage
                  src={img.url}
                  alt={img.alt}
                  width={800}
                  height={i % 3 === 0 ? 1000 : i % 3 === 1 ? 800 : 640}
                  sizes="(min-width: 768px) 33vw, 50vw"
                  className="h-auto w-full object-cover transition duration-700 group-hover:scale-105"
                />
                {(img.caption || img.alt) && (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-cocoa-900/70 to-transparent p-4 text-sm text-cream opacity-0 transition group-hover:opacity-100">
                    {img.caption ?? img.alt}
                  </figcaption>
                )}
              </figure>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-cocoa-400">Em breve, novas fotos por aqui!</p>
      )}

      {testimonials && testimonials.length > 0 && (
        <section className="mt-24" aria-labelledby="depoimentos">
          <SectionHeading eyebrow="Depoimentos" title={<span id="depoimentos">O carinho de quem provou</span>} />
          <Testimonials items={testimonials} />
        </section>
      )}

      <div className="mt-20 rounded-4xl bg-blush-100 px-6 py-14 text-center">
        <h2 className="heading-lg">Sua festa pode ser a próxima</h2>
        <p className="mx-auto mt-3 max-w-md text-cocoa-600">Conte como você imagina e a gente cria algo único para você.</p>
        <Link href="/encomendas" className="btn-primary mt-8">
          Solicitar orçamento
        </Link>
      </div>
    </div>
  );
}
