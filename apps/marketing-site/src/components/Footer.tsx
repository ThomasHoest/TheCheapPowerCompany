import { da } from '@/content/da';
import { COMPANY_NAME, CVR_NUMBER, CONTACT_EMAIL, FOUNDED_YEAR } from '@/content/legal';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.brand}>
            <a href="/" className={styles.logo}>
              tcpc
            </a>
            <p className={styles.tagline}>{da.footer.tagline}</p>
            <p className={styles.cvr}>CVR {CVR_NUMBER}</p>
          </div>

          <div className={styles.linkGroup}>
            <p className={styles.linkGroupHeading}>{da.footer.columns.product.heading}</p>
            <ul className={styles.linkList}>
              {da.footer.columns.product.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={styles.link}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.linkGroup}>
            <p className={styles.linkGroupHeading}>{da.footer.columns.company.heading}</p>
            <ul className={styles.linkList}>
              {da.footer.columns.company.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={styles.link}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.linkGroup}>
            <p className={styles.linkGroupHeading}>{da.footer.columns.legal.heading}</p>
            <ul className={styles.linkList}>
              {da.footer.columns.legal.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={styles.link}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {FOUNDED_YEAR} {COMPANY_NAME} · CVR {CVR_NUMBER} ·{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className={styles.link}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
