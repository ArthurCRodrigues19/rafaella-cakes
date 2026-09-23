import type { Metadata } from 'next';
import { getStoreSettings } from '@/lib/settings';
import { whatsappLink } from '@/lib/format';
import { ContactForm } from '@/components/ContactForm';
import { ClockIcon, InstagramIcon, MailIcon, PhoneIcon, PinIcon, WhatsappIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Contato e localização',
  description: 'Fale com a Rafaella Cakes pelo WhatsApp, telefone, e-mail ou Instagram. Veja nosso endereço e horários.',
  alternates: { canonical: '/contato' },
};

export default async function ContactPage() {
  const s = await getStoreSettings();
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(s.mapQuery || `${s.addressLine} ${s.city}`)}&output=embed`;

  const channels = [
    s.whatsapp && { icon: WhatsappIcon, label: 'WhatsApp', value: 'Chamar no WhatsApp', href: whatsappLink(s.whatsapp, 'Olá! Vim pelo site 💕') },
    s.phone && { icon: PhoneIcon, label: 'Telefone', value: s.phone, href: `tel:${s.phone.replace(/\D/g, '')}` },
    s.email && { icon: MailIcon, label: 'E-mail', value: s.email, href: `mailto:${s.email}` },
    s.instagramHandle && { icon: InstagramIcon, label: 'Instagram', value: `@${s.instagramHandle}`, href: `https://instagram.com/${s.instagramHandle}` },
  ].filter(Boolean) as { icon: typeof PhoneIcon; label: string; value: string; href: string }[];

  return (
    <div className="container-page py-12 md:py-16">
      <header className="mb-12 text-center">
        <p className="eyebrow mb-3">Contato</p>
        <h1 className="heading-lg">Vamos conversar?</h1>
        <p className="mx-auto mt-3 max-w-lg text-cocoa-500">Dúvidas, sugestões ou aquele pedido especial — estamos por aqui.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <ul className="grid gap-4 sm:grid-cols-2">
            {channels.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  target={c.href.startsWith('http') ? '_blank' : undefined}
                  rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="card flex items-center gap-4 p-5 transition hover:shadow-soft"
                >
                  <span className="rounded-2xl bg-blush-100 p-3 text-blush-600">
                    <c.icon />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs uppercase tracking-wider text-cocoa-400">{c.label}</span>
                    <span className="block truncate font-medium text-cocoa-800">{c.value}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <div className="card grid gap-6 p-6 sm:grid-cols-2">
            <div className="flex gap-3">
              <PinIcon className="mt-0.5 shrink-0 text-blush-600" />
              <div>
                <h2 className="font-serif text-lg">Endereço</h2>
                <p className="text-sm text-cocoa-600">
                  {s.addressLine}
                  <br />
                  {s.city}
                </p>
                <p className="mt-1 text-xs text-cocoa-400">Retiradas com horário agendado.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <ClockIcon className="mt-0.5 shrink-0 text-blush-600" />
              <div>
                <h2 className="font-serif text-lg">Horários</h2>
                <p className="whitespace-pre-line text-sm text-cocoa-600">{s.openingHours}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl shadow-card">
            <iframe
              title={`Mapa: ${s.addressLine}`}
              src={mapSrc}
              className="h-72 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
