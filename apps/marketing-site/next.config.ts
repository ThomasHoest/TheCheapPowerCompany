import type { NextConfig } from 'next';

const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

if (!process.env.NEXT_PUBLIC_ONBOARDING_URL) {
  if (isBuild) {
    throw new Error('Missing required env var: NEXT_PUBLIC_ONBOARDING_URL');
  } else {
    console.warn('⚠ NEXT_PUBLIC_ONBOARDING_URL not set — CTAs will fall back to /tilmeld');
  }
}

if (!process.env.NEXT_PUBLIC_BACKEND_PRICE_API_BASE_URL) {
  if (isBuild) {
    throw new Error('Missing required env var: NEXT_PUBLIC_BACKEND_PRICE_API_BASE_URL');
  } else {
    console.warn('⚠ NEXT_PUBLIC_BACKEND_PRICE_API_BASE_URL not set — price widget will use mock data');
  }
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://plausible.io",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://plausible.io",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
