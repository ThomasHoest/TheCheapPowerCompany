import type { Metadata } from 'next';
import { fetchCurrentPrice } from '@/lib/priceApi';
import SectionHero from '@/components/SectionHero';
import HowItWorks from '@/components/HowItWorks';
import PricingSection from '@/components/PricingSection';
import CompanionAppTeaser from '@/components/CompanionAppTeaser';
import StickyCTABar from '@/components/StickyCTABar';
import SignupCTA from '@/components/SignupCTA';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'The Cheap Power Company – Strøm til spotpris',
  description:
    'Køb strøm til spotpris med et lille fast tillæg. Ingen binding. Tilmeld dig med MitID og betal med MobilePay.',
  openGraph: {
    title: 'The Cheap Power Company – Strøm til spotpris',
    description:
      'Køb strøm til spotpris med et lille fast tillæg. Ingen binding. Tilmeld dig med MitID og betal med MobilePay.',
    locale: 'da_DK',
    type: 'website',
  },
};

export default async function HomePage() {
  const priceResult = await fetchCurrentPrice();

  return (
    <>
      <SectionHero priceResult={priceResult} />
      <HowItWorks />
      <PricingSection />
      <CompanionAppTeaser />

      {/* Final dark CTA strip */}
      <section className={styles.finalCta} aria-labelledby="final-cta-heading">
        <div className="container">
          <h2 id="final-cta-heading" className={styles.finalCtaHeading}>
            Klar til billigere strøm?
          </h2>
          <SignupCTA placement="final-strip" variant="inverse" />
        </div>
      </section>

      {/* Sentinel + sticky bar for mobile — placed after hero section */}
      <StickyCTABar />
    </>
  );
}
