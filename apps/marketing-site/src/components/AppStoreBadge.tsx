import { da } from '@/content/da';
import styles from './AppStoreBadge.module.css';

type Props = {
  store: 'appstore' | 'googleplay';
  url?: string;
};

function AppleIcon() {
  return (
    <svg
      className={styles.icon}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M11.182 9.966c-.018 1.983 1.732 2.645 1.75 2.653-.014.047-.273.933-.9 1.848-.543.793-1.104 1.583-1.99 1.6-.87.016-1.15-.516-2.143-.516-.994 0-1.304.5-2.126.532-.858.032-1.51-.851-2.058-1.641C2.398 12.478 1.542 9.736 2.57 7.89c.51-.916 1.423-1.497 2.414-1.513.847-.016 1.644.57 2.162.57.516 0 1.486-.705 2.503-.602.427.018 1.624.172 2.392 1.303-.062.038-1.43.835-1.415 2.318h-.444zm-1.26-4.484c.454-.55.762-1.315.678-2.075-.655.027-1.449.437-1.918.984-.42.487-.79 1.266-.69 2.013.726.056 1.472-.368 1.93-.922z" />
    </svg>
  );
}

function GooglePlayIcon() {
  return (
    <svg
      className={styles.icon}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14.222 7.634L11.891 6.33 9.56 8l2.331 1.67 2.331-1.304a.44.44 0 000-.732zM2.39 1.213L9.042 7.5 2.39 13.787A.88.88 0 012 13.08V2.92a.88.88 0 01.39-.707zm7.46 6.287L3.197 1.6l7.06 3.95L8.03 7.5l1.82 1.95-7.06 3.95 6.653-5.9z" />
    </svg>
  );
}

export default function AppStoreBadge({ store, url }: Props) {
  const isAppStore = store === 'appstore';
  const alt = isAppStore ? da.app.appStoreAlt : da.app.googlePlayAlt;
  const label = isAppStore ? 'App Store' : 'Google Play';
  const Icon = isAppStore ? AppleIcon : GooglePlayIcon;

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.badge}
        aria-label={alt}
      >
        <Icon />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <span className={`${styles.badge} ${styles.comingSoon}`} aria-label={da.app.appStoreComingSoonAlt}>
      <Icon />
      <span>{da.app.comingSoon}</span>
    </span>
  );
}
