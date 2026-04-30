import {
  MARKUP_ORE_KWH,
  SUBSCRIPTION_MONTHLY_DKK,
  SUBSCRIPTION_WEEKLY_DKK,
  EXAMPLE_ANNUAL_KWH,
} from '@/content/pricing';
import { da } from '@/content/da';
import FeatureCard from './FeatureCard';
import SignupCTA from './SignupCTA';
import styles from './PricingSection.module.css';

function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 10l4 4 8-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PricingSection() {
  const monthlyTotal = (SUBSCRIPTION_MONTHLY_DKK + (EXAMPLE_ANNUAL_KWH / 12) * (MARKUP_ORE_KWH / 100)).toFixed(0);

  return (
    <section id="pris" className={styles.section} aria-labelledby="pricing-heading">
      <div className="container">
        <h2 id="pricing-heading" className={styles.heading}>
          {da.pricing.heading}
        </h2>

        <div className={styles.grid}>
          <FeatureCard
            number={1}
            title={da.pricing.markupLabel}
            body={`${MARKUP_ORE_KWH} ${da.pricing.markupUnit} — betales pr. kWh du forbruger.`}
          />
          <div className={styles.recommendedWrapper}>
            <span className={styles.recommendedBadge}>{da.pricing.recommendedBadge}</span>
            <FeatureCard
              number={2}
              title={da.pricing.monthlyLabel}
              body={`${SUBSCRIPTION_MONTHLY_DKK} kr./måned — fast beløb uanset forbrug.`}
            />
          </div>
          <FeatureCard
            number={3}
            title={da.pricing.weeklyLabel}
            body={`${SUBSCRIPTION_WEEKLY_DKK} kr./uge — fleksibel ugentlig fakturering.`}
          />
        </div>

        <div className={styles.exampleBox}>
          <h3 className={styles.exampleHeading}>{da.pricing.exampleHeading}</h3>
          <p className={styles.exampleText}>
            Et husstand der bruger {EXAMPLE_ANNUAL_KWH.toLocaleString('da-DK')} kWh/år betaler ca.{' '}
            <strong>{monthlyTotal} kr.</strong> om måneden i abonnement plus{' '}
            <strong>{MARKUP_ORE_KWH} øre/kWh</strong> i tillæg.
          </p>
        </div>

        <div className={styles.noBindingStrip}>
          <ul className={styles.noBindingList}>
            {['Ingen binding', 'Ingen oprettelsesgebyr', 'Ingen skjulte gebyrer'].map((item) => (
              <li key={item} className={styles.noBindingItem}>
                <span className={styles.checkIcon}>
                  <CheckIcon />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.ctaWrapper}>
          <SignupCTA placement="pricing" />
        </div>
      </div>
    </section>
  );
}
