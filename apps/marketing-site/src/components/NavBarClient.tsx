'use client';

import { useState, useEffect, useCallback } from 'react';
import { da } from '@/content/da';
import SignupCTA from './SignupCTA';
import styles from './NavBarClient.module.css';

type Props = {
  children: React.ReactNode;
};

export default function NavBarClient({ children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div data-scrolled={scrolled}>
      {children}

      <button
        className={styles.hamburger}
        aria-label={menuOpen ? da.nav.menuClose : da.nav.menuOpen}
        aria-expanded={menuOpen}
        aria-controls="mobile-menu"
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        <span className={styles.hamburgerBar} />
        <span className={styles.hamburgerBar} />
        <span className={styles.hamburgerBar} />
      </button>

      <div
        id="mobile-menu"
        className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}
        aria-hidden={!menuOpen}
        role="dialog"
        aria-label="Mobil navigation"
      >
        <div className={styles.mobileMenuHeader}>
          <span className={styles.mobileMenuLogo}>tcpc</span>
          <button
            className={styles.closeButton}
            aria-label={da.nav.menuClose}
            onClick={closeMenu}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <nav aria-label="Mobil navigation">
          <ul className={styles.mobileNavList}>
            <li>
              <a href="#sadan-virker-det" className={styles.mobileNavLink} onClick={closeMenu}>
                {da.nav.howItWorks}
              </a>
            </li>
            <li>
              <a href="#pris" className={styles.mobileNavLink} onClick={closeMenu}>
                {da.nav.pricing}
              </a>
            </li>
            <li>
              <a href="#app" className={styles.mobileNavLink} onClick={closeMenu}>
                {da.nav.app}
              </a>
            </li>
            <li>
              <a href="#faq" className={styles.mobileNavLink} onClick={closeMenu}>
                {da.nav.faq}
              </a>
            </li>
          </ul>
        </nav>

        <div className={styles.mobileMenuCta}>
          <SignupCTA placement="top-nav" />
        </div>
      </div>

      {menuOpen && (
        <div className={styles.overlay} aria-hidden="true" onClick={closeMenu} />
      )}
    </div>
  );
}
