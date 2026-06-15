/** @type {import('next').NextConfig} */

// URL interna del backend dentro de la red Docker.
// En producción (docker-compose): 'http://backend:4000'
// En desarrollo local: setear BACKEND_URL=http://localhost:4000 en .env.local
const BACKEND_INTERNAL_URL = process.env.BACKEND_URL || 'http://backend:4000';

const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        // El browser llama /api-backend/... (HTTPS, misma origin)
        // Next.js server lo re-direcciona internamente al backend (HTTP, red Docker)
        source: '/api-backend/:path*',
        destination: `${BACKEND_INTERNAL_URL}/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
