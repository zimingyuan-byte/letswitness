const {
  PHASE_DEVELOPMENT_SERVER,
} = require('next/constants')

module.exports = (phase) => {
  const distDir =
    process.env.NEXT_DIST_DIR ||
    (phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next')

  /** @type {import('next').NextConfig} */
  return {
    // Keep dev output isolated by default while preserving the
    // standard `.next` production output expected by Vercel.
    distDir,
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
