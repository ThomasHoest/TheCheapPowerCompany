import styles from './PrimaryButton.module.css';

type PrimaryButtonProps = {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'inverse';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
};

export default function PrimaryButton({
  href,
  onClick,
  children,
  variant = 'default',
  disabled,
  type = 'button',
  className,
}: PrimaryButtonProps) {
  const cls = [
    styles.button,
    variant === 'inverse' ? styles.inverse : styles.default,
    disabled ? styles.disabled : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (href) {
    return (
      <a href={href} className={cls} role="button">
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}
