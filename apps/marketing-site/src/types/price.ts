export type PriceData = {
  priceOreKwh: number;
  updatedAt: string;
  area: 'DK1' | 'DK2';
};

export type PriceResult =
  | { ok: true; data: PriceData }
  | { ok: false; error: 'timeout' | 'network' | 'parse' | 'upstream' };
