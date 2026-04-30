import Link from 'next/link';
import { da } from '@/content/da';
import SignupCTA from './SignupCTA';
import NavBarClient from './NavBarClient';
import styles from './NavBar.module.css';

export default function NavBar() {
  return (
    <header className={styles.header}>
      <NavBarClient>
        <div className={styles.inner}>
          <Link href="/" className={styles.logo} aria-label="The Cheap Power Company — forside">
            tcpc
          </Link>

          <nav className={styles.desktopNav} aria-label="Primær navigation">
            <ul className={styles.navList}>
              <li>
                <a href="#sadan-virker-det" className={styles.navLink}>
                  {da.nav.howItWorks}
                </a>
              </li>
              <li>
                <a href="#pris" className={styles.navLink}>
                  {da.nav.pricing}
                </a>
              </li>
              <li>
                <a href="#app" className={styles.navLink}>
                  {da.nav.app}
                </a>
              </li>
              <li>
                <a href="#faq" className={styles.navLink}>
                  {da.nav.faq}
                </a>
              </li>
            </ul>
          </nav>

          <div className={styles.actions}>
            <div className={styles.desktopCta}>
              <SignupCTA placement="top-nav" />
            </div>
          </div>
        </div>
      </NavBarClient>
    </header>
  );
}
