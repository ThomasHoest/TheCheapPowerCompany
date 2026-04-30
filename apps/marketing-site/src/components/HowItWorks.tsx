import { da } from '@/content/da';
import FeatureCard from './FeatureCard';
import styles from './HowItWorks.module.css';

export default function HowItWorks() {
  return (
    <section id="sadan-virker-det" className={styles.section} aria-labelledby="how-it-works-heading">
      <div className="container">
        <h2 id="how-it-works-heading" className={styles.heading}>
          {da.howItWorks.heading}
        </h2>
        <div className={styles.grid}>
          {da.howItWorks.steps.map((step, index) => (
            <FeatureCard
              key={step.title}
              number={(index + 1) as 1 | 2 | 3}
              title={step.title}
              body={step.body}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
