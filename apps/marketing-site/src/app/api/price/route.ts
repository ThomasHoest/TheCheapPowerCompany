import { NextResponse } from 'next/server';
import { fetchCurrentPrice } from '@/lib/priceApi';

export async function GET() {
  const result = await fetchCurrentPrice();

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
