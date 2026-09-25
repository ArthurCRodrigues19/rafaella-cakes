import { serverGet } from '@/lib/server-api';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import type { InstagramPost } from '@/lib/types';
import { SafeImage } from '../SafeImage';
import { InstagramIcon } from '../icons';
import { SectionHeading } from '../ui';

/** Seção "Siga-nos": posts mais recentes do Instagram (ou exemplos, sem token configurado). */
export async function InstagramFeed({ handle }: { handle: string }) {
  const feed = await serverGet<{ posts: InstagramPost[]; source: 'instagram' | 'mock' }>('/instagram', 600);
  const posts = feed?.posts ?? [];
  if (!posts.length) return null;
  const username = handle || DEFAULT_SETTINGS.instagramHandle;
  const profileUrl = `https://instagram.com/${username}`;

  return (
    <section className="container-page py-20" aria-labelledby="instagram-title">
      <SectionHeading
        eyebrow="Siga-nos"
        title={<span id="instagram-title">Bastidores no Instagram</span>}
        subtitle={
          <>
            Novidades, encomendas especiais e um pouquinho da nossa cozinha em{' '}
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="link">
              @{username}
            </a>
          </>
        }
      />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {posts.slice(0, 8).map((post) => (
          <li key={post.id}>
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block aspect-square overflow-hidden rounded-2xl bg-blush-100"
            >
              <SafeImage
                src={post.mediaUrl}
                alt={post.caption ? post.caption.slice(0, 120) : 'Publicação da Rafaella Cakes no Instagram'}
                fill
                sizes="(min-width: 640px) 25vw, 50vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-cocoa-900/0 text-white opacity-0 transition group-hover:bg-cocoa-900/40 group-hover:opacity-100">
                <InstagramIcon width={28} height={28} />
              </span>
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-8 text-center">
        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">
          <InstagramIcon /> Seguir @{username}
        </a>
      </div>
    </section>
  );
}
