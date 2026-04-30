import { da } from '@/content/da';
import AppStoreBadge from './AppStoreBadge';
import styles from './CompanionAppTeaser.module.css';

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
      <circle cx="10" cy="10" r="10" fill="var(--color-brand-primary-subtle)" />
      <path
        d="M6 10l3 3 5-5"
        stroke="var(--color-brand-primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CompanionAppTeaser() {
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL;
  const googlePlayUrl = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL;

  return (
    <section id="app" className={styles.section} aria-labelledby="app-heading">
      <div className="container">
        <div className={styles.inner}>
          {/* Phone mockup placeholder */}
          <div
            className={styles.phoneFrame}
            role="img"
            aria-label="Skærmbillede af The Cheap Power Company app"
          />

          <div className={styles.textContent}>
            <h2 id="app-heading" className={styles.heading}>
              {da.app.heading}
            </h2>
            <p className={styles.subheading}>{da.app.subheading}</p>

            <ul className={styles.featureList}>
              {da.app.features.map((feature) => (
                <li key={feature} className={styles.featureItem}>
                  <span className={styles.checkIcon}>
                    <CheckIcon />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className={styles.badges}>
              <AppStoreBadge store="appstore" url={appStoreUrl} />
              <AppStoreBadge store="googleplay" url={googlePlayUrl} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
