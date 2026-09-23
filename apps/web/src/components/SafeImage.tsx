'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';

const FALLBACK = '/placeholder-cake.svg';

/**
 * next/image com fallback: se a foto não carregar, mostra uma ilustração da marca.
 * - Imagens enviadas pelo painel (/uploads) e externas (Instagram) não passam pelo
 *   otimizador do Next para evitar restrições de host; as do Unsplash são otimizadas
 *   (WebP/AVIF + tamanhos responsivos) e todas têm lazy loading por padrão.
 */
export function SafeImage({ src, alt, ...props }: Omit<ImageProps, 'src'> & { src: string | null | undefined }) {
  const [failed, setFailed] = useState(false);
  const finalSrc = !src || failed ? FALLBACK : src;
  const optimizable = finalSrc.startsWith('https://images.unsplash.com');

  return (
    <Image
      {...props}
      src={finalSrc}
      alt={alt}
      unoptimized={!optimizable}
      onError={() => setFailed(true)}
    />
  );
}
