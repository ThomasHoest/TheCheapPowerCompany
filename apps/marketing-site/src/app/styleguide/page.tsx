import PrimaryButton from '@/components/PrimaryButton';
import styles from './page.module.css';

const COLOUR_TOKENS = [
  { token: '--color-brand-primary', hex: '#1F8F4E', label: 'Brand Primary' },
  { token: '--color-brand-primary-hover', hex: '#1A7A42', label: 'Brand Primary Hover' },
  { token: '--color-brand-primary-subtle', hex: '#E6F4EC', label: 'Brand Primary Subtle' },
  { token: '--color-brand-secondary', hex: '#0E3B26', label: 'Brand Secondary' },
  { token: '--color-brand-gradient-from', hex: '#1F8F4E', label: 'Gradient From' },
  { token: '--color-brand-gradient-to', hex: '#7CD6A6', label: 'Gradient To' },
  { token: '--color-surface-default', hex: '#FFFFFF', label: 'Surface Default' },
  { token: '--color-surface-muted', hex: '#F7FAF8', label: 'Surface Muted' },
  { token: '--color-surface-inverse', hex: '#0E3B26', label: 'Surface Inverse' },
  { token: '--color-text-primary', hex: '#0E1F17', label: 'Text Primary' },
  { token: '--color-text-secondary', hex: '#475A52', label: 'Text Secondary' },
  { token: '--color-text-disabled', hex: '#9AA8A2', label: 'Text Disabled' },
  { token: '--color-text-on-brand', hex: '#FFFFFF', label: 'Text on Brand' },
  { token: '--color-text-on-inverse', hex: '#F2F7F4', label: 'Text on Inverse' },
  { token: '--color-error', hex: '#B42318', label: 'Error' },
  { token: '--color-warning', hex: '#B25E09', label: 'Warning' },
  { token: '--color-success', hex: '#1F8F4E', label: 'Success' },
];

const TYPE_TOKENS = [
  { token: '--font-size-xs', size: '12px', label: 'XS — Captions' },
  { token: '--font-size-sm', size: '14px', label: 'SM — Small body' },
  { token: '--font-size-base', size: '16px', label: 'Base — Body' },
  { token: '--font-size-md', size: '18px', label: 'MD — Lead' },
  { token: '--font-size-lg', size: '20px', label: 'LG — FAQ questions' },
  { token: '--font-size-xl', size: '24px', label: 'XL — Sub-headings' },
  { token: '--font-size-2xl', size: '32px', label: '2XL — Section headings mobile' },
  { token: '--font-size-3xl', size: '40px', label: '3XL — Section headings desktop' },
  { token: '--font-size-4xl', size: '56px', label: '4XL — Hero mobile' },
  { token: '--font-size-5xl', size: '72px', label: '5XL — Hero desktop' },
];

export default function StyleguidePage() {
  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.pageTitle}>Design Styleguide</h1>
        <p className={styles.pageNote}>
          For design review only. Not a production page.
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Colour Tokens</h2>
          <div className={styles.swatchGrid}>
            {COLOUR_TOKENS.map(({ token, hex, label }) => (
              <div key={token} className={styles.swatch}>
                <div
                  className={styles.swatchColour}
                  style={{ background: `var(${token})`, border: '1px solid var(--color-border-default)' }}
                />
                <p className={styles.swatchLabel}>{label}</p>
                <p className={styles.swatchToken}>{token}</p>
                <p className={styles.swatchHex}>{hex}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Typography Scale</h2>
          <div className={styles.typeStack}>
            {TYPE_TOKENS.map(({ token, size, label }) => (
              <div key={token} className={styles.typeRow}>
                <p
                  className={styles.typeSample}
                  style={{ fontSize: `var(${token})`, lineHeight: 1.3 }}
                >
                  Strøm til spotpris
                </p>
                <span className={styles.typeMeta}>
                  {label} · {size} · {token}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Buttons</h2>
          <div className={styles.buttonRow}>
            <PrimaryButton href="#">Tilmeld dig</PrimaryButton>
            <PrimaryButton href="#" variant="inverse">Tilmeld dig (inverse)</PrimaryButton>
            <PrimaryButton disabled>Tilmeld dig (disabled)</PrimaryButton>
          </div>
        </section>
      </div>
    </div>
  );
}
