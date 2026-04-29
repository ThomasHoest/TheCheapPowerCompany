'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PriceResult } from '@/types/price';
import { formatOreKwh, formatUpdatedAt, isStale } from '@/lib/format';
import { da } from '@/content/da';
import styles from './PriceDisplay.module.css';

type Props = {
  initialResult: PriceResult;
  children: React.ReactNode;
};

export default function PriceDisplayClient({ initialResult, children }: Props) {
  const [result, setResult] = useState<PriceResult>(initialResult);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/price');
      if (!res.ok) {
        setResult({ ok: false, error: 'upstream' });
        return;
      }
      const json = await res.json();
      setResult(json as PriceResult);
    } catch {
      setResult({ ok: false, error: 'network' });
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(refresh, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (!mounted) {
    return <>{children}</>;
  }

  const stale = result.ok ? isStale(result.data.updatedAt) : false;
  const dotClass = !result.ok
    ? styles.dotError
    : stale
    ? styles.dotStale
    : styles.dotFresh;

  return (
    <div className={styles.card}>
      <p className={styles.eyebrow}>{da.price.eyebrow}</p>

      <div className={styles.numeralRow} aria-live="polite" aria-atomic="true">
        {result.ok ? (
          <>
            <div className={styles.halo} aria-hidden="true" />
            <span className={styles.numeral}>
              {formatOreKwh(result.data.priceOreKwh).replace(' øre', '')}
            </span>
            <span className={styles.unit}>{da.price.unit}</span>
          </>
        ) : (
          <p className={styles.errorText}>{da.price.error}</p>
        )}
      </div>

      {result.ok && (
        <div className={styles.meta}>
          <span className={`${styles.dot} ${dotClass}`} aria-hidden="true" />
          <span className={styles.timestamp}>{formatUpdatedAt(result.data.updatedAt)}</span>
        </div>
      )}

      <p className={styles.explainer}>{da.price.explainer}</p>

      <a
        href={da.price.attributionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.attribution}
      >
        {da.price.attribution}
      </a>

      <noscript>
        <p className={styles.noscript}>{da.price.noJs}</p>
      </noscript>
    </div>
  );
}
