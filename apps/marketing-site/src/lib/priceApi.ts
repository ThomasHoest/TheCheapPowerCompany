import type { PriceData, PriceResult } from '@/types/price';

const MOCK_PRICE: PriceData = {
  priceOreKwh: 142.3,
  updatedAt: new Date().toISOString(),
  area: 'DK2',
};

export async function fetchCurrentPrice(): Promise<PriceResult> {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_PRICE_API_BASE_URL;

  if (!baseUrl) {
    return { ok: true, data: MOCK_PRICE };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${baseUrl}/price/current`, {
      signal: controller.signal,
      next: { revalidate: 0 },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { ok: false, error: 'upstream' };
    }

    const json = await response.json();

    if (
      typeof json.priceOreKwh !== 'number' ||
      typeof json.updatedAt !== 'string' ||
      (json.area !== 'DK1' && json.area !== 'DK2')
    ) {
      return { ok: false, error: 'parse' };
    }

    const data: PriceData = {
      priceOreKwh: json.priceOreKwh,
      updatedAt: json.updatedAt,
      area: json.area,
    };

    return { ok: true, data };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'timeout' };
    }

    return { ok: false, error: 'network' };
  }
}
