import path from 'node:path';
import dotenv from 'dotenv';

// Um único .env na raiz do monorepo alimenta a API e o site
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:4000';
const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    // Usado pelos Server Components para falar direto com a API
    API_URL,
    NEXT_PUBLIC_SITE_URL: WEB_URL,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
  // O navegador fala só com o site (mesma origem): /api e /uploads são repassados para a API.
  // Isso simplifica cookies de sessão (httpOnly, SameSite) e elimina problemas de CORS.
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_URL}/uploads/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
