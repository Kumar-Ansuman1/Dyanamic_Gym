const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

// Backend sends Decimal as a string ("3000.00"); never do money math on floats beyond display.
export const formatINR = (amount: string | number) => inr.format(Number(amount))

const shortDate = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
const fullDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const longDay = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
const dayMonth = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

// ISO "YYYY-MM-DD" parsed as a local date, not UTC midnight.
const toLocalDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar date as ISO "YYYY-MM-DD" (what the API expects for date params). */
export const toISODate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const addDays = (iso: string, days: number) => {
  const date = toLocalDate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export const formatShortDate = (iso: string) => shortDate.format(toLocalDate(iso))
export const formatDate = (iso: string) => fullDate.format(toLocalDate(iso))
export const formatLongDay = (date: Date) => longDay.format(date)

/** "3 Aug → 2 Nov 2025"; both years when the period crosses one ("3 Nov 2025 → 2 Nov 2026"). */
export const formatPeriod = (start: string, end: string) =>
  start.slice(0, 4) === end.slice(0, 4)
    ? `${dayMonth.format(toLocalDate(start))} → ${formatDate(end)}`
    : `${formatDate(start)} → ${formatDate(end)}`

/** A timestamp (payment paid_at) as "Mon, 3 Nov 2025" in the owner's timezone. en-IN puts a comma before the year. */
export const formatDay = (timestamp: string) => {
  const date = new Date(timestamp)
  return `${shortDate.format(date)} ${date.getFullYear()}`
}

export const formatMonths = (months: number) => `${months} ${months === 1 ? 'month' : 'months'}`

/** Paid-on date to paid_at: noon local time, so the day survives the trip through UTC. */
export const toPaidAt = (iso: string) => new Date(`${iso}T12:00:00`).toISOString()

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank' },
  { value: 'other', label: 'Other' },
] as const

export const methodLabel = (method: string) =>
  method === 'bank_transfer' ? 'Bank transfer' : (PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method)

export function daysUntil(iso: string, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((toLocalDate(iso).getTime() - start.getTime()) / 86_400_000)
}
