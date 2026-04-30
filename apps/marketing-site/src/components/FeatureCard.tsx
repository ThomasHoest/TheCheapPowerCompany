import styles from './FeatureCard.module.css';

type Props = {
  number?: 1 | 2 | 3;
  icon?: React.ReactNode;
  title: string;
  body: string;
};

export default function FeatureCard({ number, icon, title, body }: Props) {
  return (
    <article className={styles.card}>
      {(number !== undefined || icon) && (
        <div className={styles.badge} aria-hidden="true">
          {icon ?? number}
        </div>
      )}
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.body}>{body}</p>
    </article>
  );
}
