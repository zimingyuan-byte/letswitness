const {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} = require('next/constants')

module.exports = (phase) => {
  const useProductionDistDir =
    phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER

  /** @type {import('next').NextConfig} */
  return {
    // Keep dev and build outputs separate so running `next build`
    // never corrupts the active dev server cache.
    distDir: useProductionDistDir ? '.next-build' : '.next-dev',
    experimental: {
      serverActions: {
        // Current MVP media uploads post files through a Server Action before
        // they are forwarded to Supabase Storage.
        bodySizeLimit: '210mb',
      },
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'lh3.googleusercontent.com',
        },
        {
          protocol: 'https',
          hostname: '**.supabase.co',
        },
      ],
    },
  }
}
