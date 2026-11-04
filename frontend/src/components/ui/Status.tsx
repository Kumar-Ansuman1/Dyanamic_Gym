import type { PaymentStatus, SubscriptionStatus } from '../../types/api.ts'

// Status is carried by the mark's form and a word, never by colour alone.
type Form = 'solid' | 'dashed' | 'hollow' | 'struck'

function Mark({ form }: { form: Form }) {
  return (
    <svg viewBox="0 0 10 10" className="size-2.5 shrink-0" aria-hidden>
      {form === 'solid' ? (
        <rect x="1" y="1" width="8" height="8" fill="currentColor" />
      ) : (
        <rect
          x="1.5"
          y="1.5"
          width="7"
          height="7"
          fill="none"
          stroke="currentColor"
          strokeDasharray={form === 'dashed' ? '2 1.5' : undefined}
        />
      )}
      {form === 'struck' && <line x1="1" y1="9" x2="9" y2="1" stroke="currentColor" />}
    </svg>
  )
}

export function Status({ form, label, className = '' }: { form: Form; label: string; className?: string }) {
  return (
    <span className={`inline-flex w-fit items-center gap-2 text-sm whitespace-nowrap ${className}`}>
      <Mark form={form} />
      {label}
    </span>
  )
}

// "pending" means the start date is in the future, not unpaid. Say so.
const SUBSCRIPTION: Record<SubscriptionStatus, [Form, string]> = {
  active: ['solid', 'Active'],
  pending: ['dashed', 'Upcoming'],
  expired: ['hollow', 'Expired'],
  cancelled: ['struck', 'Cancelled'],
}

const PAYMENT: Record<PaymentStatus, [Form, string]> = {
  recorded: ['solid', 'Received'],
  refunded: ['hollow', 'Refunded'],
  reversed: ['struck', 'Reversed'],
}

export function SubscriptionStatusMark({ status }: { status: SubscriptionStatus }) {
  const [form, label] = SUBSCRIPTION[status]
  return <Status form={form} label={label} className={status === 'active' ? 'text-fg' : 'text-fg-muted'} />
}

export function PaymentStatusMark({ status }: { status: PaymentStatus }) {
  const [form, label] = PAYMENT[status]
  return <Status form={form} label={label} className={status === 'recorded' ? 'text-fg' : 'text-fg-muted'} />
}

export function MemberStatusMark({ active }: { active: boolean }) {
  return active ? (
    <Status form="solid" label="Active" className="text-fg" />
  ) : (
    <Status form="hollow" label="Inactive" className="text-fg-muted" />
  )
}

// One urgency ramp for every screen, aligned to the backend reminders (7, 3, 0 days).
export type Urgency = 'clear' | 'week' | 'soon' | 'today' | 'lapsed'

export function urgencyOf(daysLeft: number): Urgency {
  if (daysLeft < 0) return 'lapsed'
  if (daysLeft === 0) return 'today'
  if (daysLeft <= 3) return 'soon'
  if (daysLeft <= 7) return 'week'
  return 'clear'
}

const URGENCY_CLASS: Record<Urgency, string> = {
  today: 'bg-led text-ink px-1.5 font-semibold',
  soon: 'text-led font-semibold',
  week: 'text-fg',
  clear: 'text-fg-muted',
  lapsed: 'text-fg-muted',
}

function urgencyText(days: number) {
  if (days < 0) return `Lapsed ${-days} ${days === -1 ? 'day' : 'days'} ago`
  if (days === 0) return 'Ends today'
  if (days === 1) return 'Ends tomorrow'
  return `Ends in ${days} days`
}

export function UrgencyTag({ days }: { days: number }) {
  return (
    <span className={`inline-flex h-6 w-fit items-center text-sm whitespace-nowrap ${URGENCY_CLASS[urgencyOf(days)]}`}>
      {urgencyText(days)}
    </span>
  )
}
