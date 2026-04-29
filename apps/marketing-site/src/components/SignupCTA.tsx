'use client';

import { da } from '@/content/da';
import PrimaryButton from './PrimaryButton';
import styles from './SignupCTA.module.css';

type Placement = 'hero' | 'top-nav' | 'pricing' | 'final-strip' | 'sticky-mobile';

type Props = {
  placement: Placement;
  variant?: 'default' | 'inverse';
};

export default function SignupCTA({ placement, variant = 'default' }: Props) {
  const onboardingUrl = process.env.NEXT_PUBLIC_ONBOARDING_URL ?? '/tilmeld';
  const isDisabled = process.env.NEXT_PUBLIC_SIGNUP_DISABLED === 'true';

  const handleClick = () => {
    if (typeof window !== 'undefined' && typeof (window as Window & { plausible?: (event: string, opts: { props: Record<string, string> }) => void }).plausible === 'function') {
      (window as Window & { plausible?: (event: string, opts: { props: Record<string, string> }) => void }).plausible?.('cta_clicked', { props: { placement } });
    }
  };

  if (isDisabled) {
    return (
      <span className={styles.disabledWrapper}>
        <span className={styles.disabledPill}>{da.nav.cta}</span>
        <span className={styles.disabledMessage}>
          Tilmelding er midlertidigt nede — prøv igen om lidt.
        </span>
      </span>
    );
  }

  return (
    <PrimaryButton href={onboardingUrl} onClick={handleClick} variant={variant}>
      {da.nav.cta}
    </PrimaryButton>
  );
}
