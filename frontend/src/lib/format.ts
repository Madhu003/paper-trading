export function formatInr(n: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits,
  }).format(n);
}

export function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
