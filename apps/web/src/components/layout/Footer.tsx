import Link from 'next/link';
import { getStoreSettings } from '@/lib/settings';
import { whatsappLink } from '@/lib/format';
import { ClockIcon, InstagramIcon, MailIcon, PhoneIcon, PinIcon, WhatsappIcon } from '../icons';
import { Logo } from './Logo';

export async function Footer() {
  const s = await getStoreSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 bg-cocoa-800 text-cocoa-100">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-xs text-sm leading-relaxed text-cocoa-200">
            Doceria artesanal. Cada receita é feita à mão, com ingredientes selecionados e muito carinho.
          </p>
          <div className="flex gap-2">
            {s.instagramHandle && (
              <a
                href={`https://instagram.com/${s.instagramHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-cocoa-600 p-2.5 transition hover:border-champagne-400 hover:text-champagne-300"
                aria-label="Instagram da Rafaella Cakes"
              >
                <InstagramIcon />
              </a>
            )}
            {s.whatsapp && (
              <a
                href={whatsappLink(s.whatsapp, 'Olá! Vim pelo site da Rafaella Cakes 💕')}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-cocoa-600 p-2.5 transition hover:border-champagne-400 hover:text-champagne-300"
                aria-label="Conversar no WhatsApp"
              >
                <WhatsappIcon />
              </a>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-4 font-serif text-lg text-cream">Navegue</h2>
          <ul className="space-y-2 text-sm">
            {[
              ['/produtos', 'Cardápio'],
              ['/encomendas', 'Encomendas personalizadas'],
              ['/galeria', 'Galeria e depoimentos'],
              ['/contato', 'Contato e localização'],
              ['/conta', 'Minha conta'],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-cocoa-200 transition hover:text-champagne-300">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 font-serif text-lg text-cream">Fale com a gente</h2>
          <ul className="space-y-3 text-sm text-cocoa-200">
            {s.phone && (
              <li className="flex gap-3">
                <PhoneIcon className="shrink-0 text-champagne-400" />
                <a href={`tel:${s.phone.replace(/\D/g, '')}`} className="hover:text-champagne-300">
                  {s.phone}
                </a>
              </li>
            )}
            {s.email && (
              <li className="flex gap-3">
                <MailIcon className="shrink-0 text-champagne-400" />
                <a href={`mailto:${s.email}`} className="break-all hover:text-champagne-300">
                  {s.email}
                </a>
              </li>
            )}
            {s.addressLine && (
              <li className="flex gap-3">
                <PinIcon className="shrink-0 text-champagne-400" />
                <span>
                  {s.addressLine}
                  <br />
                  {s.city}
                </span>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 font-serif text-lg text-cream">Horários</h2>
          <div className="flex gap-3 text-sm text-cocoa-200">
            <ClockIcon className="shrink-0 text-champagne-400" />
            <p className="whitespace-pre-line leading-relaxed">{s.openingHours}</p>
          </div>
        </div>
      </div>
      <div className="border-t border-cocoa-700">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-cocoa-300 sm:flex-row">
          <p>© {year} Rafaella Cakes. Todos os direitos reservados.</p>
          <p>
            Feito com <span aria-label="amor">♥</span> e açúcar
          </p>
        </div>
      </div>
    </footer>
  );
}
