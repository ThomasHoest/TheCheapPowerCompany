import { da } from '@/content/da';
import styles from './SkipToContent.module.css';

export default function SkipToContent() {
  return (
    <a href="#main-content" className={styles.skip}>
      {da.skipToContent}
    </a>
  );
}
