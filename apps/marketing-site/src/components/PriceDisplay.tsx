import type { PriceResult } from '@/types/price';
import { formatOreKwh, formatUpdatedAt, isStale } from '@/lib/format';
import { da } from '@/content/da';
import PriceDisplayClient from './PriceDisplayClient';
import styles from './PriceDisplay.module.css';

type Props = {
  initialResult: PriceResult;
};

export default function PriceDisplay({ initialResult }: Props) {
  return (
    <PriceDisplayClient initialResult={initialResult}>
      <PriceDisplayContent result={initialResult} />
    </PriceDisplayClient>
  );
}

type ContentProps = {
  result: PriceResult;
};

export function PriceDisplayContent({ result }: ContentProps) {
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
          <span
            className={`${styles.dot} ${isStale(result.data.updatedAt) ? styles.dotStale : styles.dotFresh}`}
            aria-hidden="true"
          />
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
