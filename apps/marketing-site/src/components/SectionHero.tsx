import type { PriceResult } from '@/types/price';
import { da } from '@/content/da';
import PriceDisplay from './PriceDisplay';
import SignupCTA from './SignupCTA';
import styles from './SectionHero.module.css';

type Props = {
  priceResult: PriceResult;
};

export default function SectionHero({ priceResult }: Props) {
  return (
    <section className={styles.section} aria-labelledby="hero-headline">
      <div className="container">
        <div className={styles.inner}>
          <div className={styles.content}>
            <p className={styles.eyebrow}>{da.hero.eyebrow}</p>
            <h1 id="hero-headline" className={styles.headline}>
              {da.hero.headline}
            </h1>
            <p className={styles.subheadline}>{da.hero.subheadline}</p>

            {/* Price shown between sub-headline and CTA on mobile so it appears above fold */}
            <div className={styles.mobilePriceSlot}>
              <PriceDisplay initialResult={priceResult} />
            </div>

            <div className={styles.ctaWrapper}>
              <SignupCTA placement="hero" />
            </div>

            <ul className={styles.trustRow} aria-label="Fordele">
              {da.hero.trustRow.map((item, i) => (
                <li key={item} className={styles.trustItem}>
                  {i > 0 && <span aria-hidden="true">·</span>}
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Price in right column on desktop */}
          <div className={styles.desktopPriceSlot}>
            <PriceDisplay initialResult={priceResult} />
          </div>
        </div>
      </div>
    </section>
  );
}
