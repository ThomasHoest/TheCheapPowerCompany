import { describe, it, expect } from 'vitest';
import { formatOreKwh, formatDkk, formatUpdatedAt, isStale } from './format';

describe('formatOreKwh', () => {
  it('formats 89.5 as "89,5 øre"', () => {
    expect(formatOreKwh(89.5)).toBe('89,5 øre');
  });

  it('formats 0 as "0 øre"', () => {
    expect(formatOreKwh(0)).toBe('0 øre');
  });

  it('formats whole numbers without decimals', () => {
    expect(formatOreKwh(100)).toBe('100 øre');
  });
});

describe('formatDkk', () => {
  it('contains "1.234" for 1234.56', () => {
    const result = formatDkk(1234.56);
    expect(result).toContain('1.234');
  });

  it('contains "kr" for 1234.56', () => {
    const result = formatDkk(1234.56);
    expect(result).toContain('kr');
  });

  it('formats 0 without throwing', () => {
    expect(() => formatDkk(0)).not.toThrow();
  });
});

describe('formatUpdatedAt', () => {
  it('contains "kl." in output', () => {
    const iso = '2026-04-29T13:42:00.000Z';
    const result = formatUpdatedAt(iso);
    expect(result).toContain('kl.');
  });

  it('contains correct hour digits', () => {
    const iso = new Date('2026-04-29T11:30:00.000Z').toISOString();
    const result = formatUpdatedAt(iso);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('starts with "Opdateret"', () => {
    const result = formatUpdatedAt(new Date().toISOString());
    expect(result.startsWith('Opdateret')).toBe(true);
  });
});

describe('isStale', () => {
  it('returns false for a fresh timestamp', () => {
    const fresh = new Date().toISOString();
    expect(isStale(fresh)).toBe(false);
  });

  it('returns false for a timestamp 30 minutes ago', () => {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(isStale(thirtyMinsAgo)).toBe(false);
  });

  it('returns true for a timestamp more than 60 minutes old', () => {
    const overAnHourAgo = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    expect(isStale(overAnHourAgo)).toBe(true);
  });

  it('returns true for a timestamp exactly 2 hours old', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(isStale(twoHoursAgo)).toBe(true);
  });
});
