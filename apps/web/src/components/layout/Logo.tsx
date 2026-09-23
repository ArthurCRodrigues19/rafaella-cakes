import Link from 'next/link';

export function Logo({ className = '', light = false }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={`group inline-flex flex-col items-center leading-none ${className}`} aria-label="Rafaella Cakes — página inicial">
      <span className={`font-script text-3xl sm:text-4xl ${light ? 'text-cream' : 'text-cocoa-700'} transition group-hover:text-blush-600`}>
        Rafaella
      </span>
      <span className={`-mt-1 text-[0.6rem] font-semibold tracking-[0.45em] ${light ? 'text-champagne-300' : 'text-champagne-600'}`}>
        CAKES
      </span>
    </Link>
  );
}
