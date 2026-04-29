'use client';

import { useEffect, useRef, useState } from 'react';
import SignupCTA from './SignupCTA';
import styles from './StickyCTABar.module.css';

export default function StickyCTABar() {
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel placed after the hero CTA — when this scrolls out, bar appears */}
      <div ref={sentinelRef} aria-hidden="true" data-sticky-sentinel />

      {visible && (
        <div className={styles.bar} role="complementary" aria-label="Tilmeld dig">
          <SignupCTA placement="sticky-mobile" />
        </div>
      )}
    </>
  );
}
