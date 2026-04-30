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
  output: 'export',
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
