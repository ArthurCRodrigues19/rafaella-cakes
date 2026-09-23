import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 text-center">
      <Logo />
      <p className="mt-10 font-script text-7xl text-blush-400">Ops!</p>
      <h1 className="heading-lg mt-2">Essa página foi comida 🍰</h1>
      <p className="mt-3 max-w-md text-cocoa-500">O endereço que você procurou não existe ou foi alterado.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          Voltar ao início
        </Link>
        <Link href="/produtos" className="btn-outline">
          Ver o cardápio
        </Link>
      </div>
    </div>
  );
}
