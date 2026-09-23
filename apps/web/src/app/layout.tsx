import type { Metadata, Viewport } from 'next';
import { Great_Vibes, Inter, Playfair_Display } from 'next/font/google';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { CartProvider } from '@/components/providers/CartProvider';
import { FavoritesProvider } from '@/components/providers/FavoritesProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import './globals.css';

// Fontes otimizadas pelo Next (self-hosted, sem layout shift)
const serif = Playfair_Display({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });
const script = Great_Vibes({ subsets: ['latin'], weight: '400', variable: '--font-script', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Rafaella Cakes · Doceria artesanal',
    template: '%s · Rafaella Cakes',
  },
  description:
    'Bolos artesanais, doces finos, tortas e sobremesas feitos à mão. Encomendas para aniversários, casamentos e festas. Peça online com entrega ou retirada.',
  keywords: ['doceria', 'confeitaria', 'bolo artesanal', 'bolo de aniversário', 'bolo de casamento', 'doces finos', 'brigadeiro gourmet'],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Rafaella Cakes',
    title: 'Rafaella Cakes · Doceria artesanal',
    description: 'Bolos, doces finos e tortas feitos à mão, com carinho, para os seus momentos especiais.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#F4D6D6',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${script.variable} ${sans.variable}`}>
      <body>
        <ToastProvider>
          <AuthProvider>
            <FavoritesProvider>
              <CartProvider>{children}</CartProvider>
            </FavoritesProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
