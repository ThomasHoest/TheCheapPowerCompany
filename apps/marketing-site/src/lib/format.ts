export function formatOreKwh(ore: number): string {
  const formatted = new Intl.NumberFormat('da-DK', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(ore);
  return `${formatted} øre`;
}

export function formatDkk(amount: number): string {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatUpdatedAt(isoString: string): string {
  const date = new Date(isoString);
  const time = new Intl.DateTimeFormat('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `Opdateret kl. ${time}`;
}

export function isStale(isoString: string): boolean {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return diffMs > 60 * 60 * 1000;
}
