export function euro(cents: number | null | undefined): string {
  if (cents == null) return '—'
  const value = cents / 100
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2).replace('.', ',')} €`
}
