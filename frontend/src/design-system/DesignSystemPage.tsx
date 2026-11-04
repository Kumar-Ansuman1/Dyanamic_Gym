import { Bell } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button.tsx'
import { ExpiryRow, type RenewPlan } from '../components/ui/ExpiryRow.tsx'
import { SelectField, Segmented, TextField } from '../components/ui/Field.tsx'
import { Notice } from '../components/ui/Notice.tsx'
import { DaysLeft, SegmentDisplay } from '../components/ui/Segment.tsx'
import {
  MemberStatusMark,
  PaymentStatusMark,
  SubscriptionStatusMark,
  UrgencyTag,
} from '../components/ui/Status.tsx'
import { Wordmark } from '../components/ui/Wordmark.tsx'
import { formatINR } from '../lib/formatters.ts'

// Living spec for the Wall Clock system. All member data below is synthetic.

const SWATCHES = [
  ['ink', '#0b0a0a', 'Page ground'],
  ['panel', '#050404', 'LED panel, inputs'],
  ['raised', '#151312', 'Open row, hover'],
  ['rule', '#2a2624', '1px dividers'],
  ['rule-strong', '#403936', 'Control borders'],
  ['fg', '#ede8e3', 'Primary text, selected'],
  ['fg-muted', '#a8a09a', 'Secondary text'],
  ['fg-faint', '#857d78', 'Hints, placeholders'],
  ['led', '#ff2a1a', 'Lit segment, act now'],
  ['led-ghost', '#2b0d0a', 'Unlit segment'],
] as const

const PLANS: RenewPlan[] = [
  { id: 'monthly', name: 'Monthly', price: '1200' },
  { id: 'quarterly', name: 'Quarterly', price: '3000' },
  { id: 'half', name: 'Half-yearly', price: '5500' },
  { id: 'annual', name: 'Annual', price: '10000' },
]

const isoIn = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const BOARD = [
  { group: 'Ends today', rows: [{ id: 'm1', name: 'Priya Sharma', code: 'GYM-0142', planId: 'quarterly', days: 0 }] },
  {
    group: 'Within 3 days',
    rows: [
      { id: 'm2', name: 'Arjun Mehta', code: 'GYM-0087', planId: 'monthly', days: 1 },
      { id: 'm3', name: 'Sneha Iyer', code: 'GYM-0231', planId: 'annual', days: 3 },
    ],
  },
  {
    group: 'Within 7 days',
    rows: [
      { id: 'm4', name: 'Mohammed Faiz', code: 'GYM-0019', planId: 'half', days: 6 },
      { id: 'm5', name: 'Kavya Reddy Venkataraman', code: 'GYM-0304', planId: 'monthly', days: 7 },
    ],
  },
  { group: 'Lapsed', rows: [{ id: 'm6', name: 'Rohit Verma', code: 'GYM-0056', planId: 'monthly', days: -4 }] },
]

const DURATIONS = [
  { value: '1', label: '1 month' },
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '12 months' },
] as const

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-rule py-10 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10 md:py-14">
      <div>
        <h2 className="label-panel text-fg">{title}</h2>
        {note && <p className="mt-2 text-[0.8125rem] text-fg-muted">{note}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function Board() {
  const [openId, setOpenId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const renew = (id: string) => {
    setSavingId(id)
    setTimeout(() => {
      setSavingId(null)
      setOpenId(null)
    }, 900)
  }

  return (
    <div className="border border-rule bg-ink">
      {BOARD.map(({ group, rows }) => (
        <div key={group}>
          <h3 className="flex items-baseline justify-between border-b border-rule bg-panel px-4 py-2.5">
            <span className="label-panel text-fg-muted">{group}</span>
            <span className="text-[0.8125rem] text-fg-muted tabular-nums">{rows.length}</span>
          </h3>
          <ul>
            {rows.map((row) => {
              const plan = PLANS.find((p) => p.id === row.planId)!
              return (
                <ExpiryRow
                  key={row.id}
                  name={row.name}
                  code={row.code}
                  planName={plan.name}
                  planId={plan.id}
                  endDate={isoIn(row.days)}
                  daysLeft={row.days}
                  plans={PLANS}
                  open={openId === row.id}
                  dimmed={openId !== null && openId !== row.id}
                  pending={savingId === row.id}
                  onToggle={() => setOpenId(openId === row.id ? null : row.id)}
                  onRenew={() => renew(row.id)}
                />
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default function DesignSystemPage() {
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]['value']>('3')
  const [method, setMethod] = useState<'cash' | 'upi' | 'card'>('upi')

  return (
    <div className="mx-auto max-w-6xl px-5 md:px-10">
      <header className="flex flex-col gap-6 py-12 md:py-20">
        <Wordmark className="text-[2.25rem] md:text-[4rem]" />
        <div className="max-w-2xl">
          <h1 className="text-[1.75rem] font-bold tracking-[-0.02em] [font-stretch:112%]">Design system</h1>
          <p className="mt-2 text-fg-muted">
            The owner app's parts, drawn from the red interval timer on the gym wall. Every membership is a
            countdown. Member names, codes and prices on this page are synthetic.
          </p>
        </div>
      </header>

      <Section title="Countdown" note="Seven-segment LED. Lit red, unlit ghosting behind. No glow, ever.">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-end gap-8">
            <div className="flex flex-col gap-3 border border-rule bg-panel px-6 py-5">
              <span className="label-panel text-fg-muted">Days left</span>
              <DaysLeft days={3} className="text-[5.5rem] md:text-[7rem]" />
            </div>
            <div className="flex flex-col gap-3">
              <SegmentDisplay value="0123456789" label="Digits zero to nine" className="text-[2.5rem]" />
              <div className="flex items-end gap-6">
                <DaysLeft days={12} className="text-[2rem]" />
                <DaysLeft days={7} className="text-[1.75rem]" />
                <DaysLeft days={0} className="text-[1.25rem]" />
                <DaysLeft days={-2} className="text-[1.25rem]" />
              </div>
            </div>
          </div>
          <p className="max-w-prose text-[0.8125rem] text-fg-muted">
            Only days left and a few key figures use segments. Single-digit values keep a blank unlit cell, as a
            real display does. Lapsed shows two dashes. Names, money and tables stay in Archivo.
          </p>
        </div>
      </Section>

      <Section title="Colour" note="Black and red, as committed. Red means act now.">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {SWATCHES.map(([name, hex, role]) => (
            <li key={name} className="flex flex-col gap-2">
              <span className="block h-14 border border-rule" style={{ background: hex }} />
              <span className="text-sm font-semibold">{name}</span>
              <span className="text-[0.8125rem] text-fg-muted tabular-nums">
                {hex} · {role}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type" note="Archivo, one family. Width axis does the work a second face would.">
        <dl className="grid gap-6">
          <div className="grid gap-1 md:grid-cols-[10rem_1fr] md:items-baseline">
            <dt className="text-[0.8125rem] text-fg-muted">Page title</dt>
            <dd className="text-[1.75rem] font-bold tracking-[-0.02em] [font-stretch:112%]">Members</dd>
          </div>
          <div className="grid gap-1 md:grid-cols-[10rem_1fr] md:items-baseline">
            <dt className="text-[0.8125rem] text-fg-muted">Faceplate label</dt>
            <dd className="label-panel">Within 3 days</dd>
          </div>
          <div className="grid gap-1 md:grid-cols-[10rem_1fr] md:items-baseline">
            <dt className="text-[0.8125rem] text-fg-muted">Row primary</dt>
            <dd className="font-semibold">Sneha Iyer</dd>
          </div>
          <div className="grid gap-1 md:grid-cols-[10rem_1fr] md:items-baseline">
            <dt className="text-[0.8125rem] text-fg-muted">Body</dt>
            <dd className="max-w-prose">
              Quarterly plan, renewed at the desk. Paid by UPI, reference attached to the payment.
            </dd>
          </div>
          <div className="grid gap-1 md:grid-cols-[10rem_1fr] md:items-baseline">
            <dt className="text-[0.8125rem] text-fg-muted">Meta</dt>
            <dd className="text-[0.8125rem] tracking-[0.04em] text-fg-muted tabular-nums">GYM-0231 · Ends Sat 1 Nov</dd>
          </div>
          <div className="grid gap-1 md:grid-cols-[10rem_1fr] md:items-baseline">
            <dt className="text-[0.8125rem] text-fg-muted">Money</dt>
            <dd className="text-[1.25rem] font-semibold tabular-nums">
              {formatINR('3000')} · {formatINR('125000')} · {formatINR('1499.5')}
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="Status" note="Form plus word. Colour never carries status alone.">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-3">
            <h3 className="text-[0.8125rem] text-fg-muted">Subscription</h3>
            <SubscriptionStatusMark status="active" />
            <SubscriptionStatusMark status="pending" />
            <SubscriptionStatusMark status="expired" />
            <SubscriptionStatusMark status="cancelled" />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-[0.8125rem] text-fg-muted">Payment</h3>
            <PaymentStatusMark status="recorded" />
            <PaymentStatusMark status="refunded" />
            <PaymentStatusMark status="reversed" />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-[0.8125rem] text-fg-muted">Member</h3>
            <MemberStatusMark active />
            <MemberStatusMark active={false} />
          </div>
        </div>
      </Section>

      <Section title="Urgency" note="One ramp on every screen: 7, 3, 0 days, matching the backend reminders.">
        <ul className="flex flex-col divide-y divide-rule border-y border-rule">
          {[
            [24, 'More than 7 days: quiet'],
            [6, 'Within 7 days: full text'],
            [2, 'Within 3 days: red'],
            [1, 'Tomorrow: red'],
            [0, 'Today: lit'],
            [-4, 'Lapsed: quiet, moves to its own list'],
          ].map(([days, rule]) => (
            <li key={days} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-2.5 md:grid-cols-[12rem_1fr]">
              <UrgencyTag days={Number(days)} />
              <span className="text-[0.8125rem] text-fg-muted">{rule}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Actions" note="Red fill only for the job at hand. Destructive actions are outlined and always confirmed.">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Renew</Button>
            <Button variant="secondary">Edit member</Button>
            <Button variant="danger">Cancel membership</Button>
            <Button variant="quiet">Not now</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" loading>
              Recording payment
            </Button>
            <Button variant="primary" disabled>
              Renew
            </Button>
            <Button variant="secondary" size="sm">
              Retry
            </Button>
            <Button variant="secondary" size="sm" aria-label="Notifications, 4 unread" className="gap-2.5">
              <Bell className="size-4" aria-hidden />
              <SegmentDisplay value="4" label="4 unread" className="text-[0.95rem]" />
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Fields" note="Labels above, help below, errors say what to do next. 16px on phones so iOS never zooms.">
        <form className="grid gap-x-6 gap-y-6 md:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
          <TextField label="Full name" defaultValue="Sneha Iyer" autoComplete="off" />
          <TextField
            label="Phone"
            defaultValue="98450 12345"
            inputMode="tel"
            error="This number already belongs to GYM-0142 Priya Sharma. Open that profile instead."
          />
          <TextField label="Email (optional)" type="email" placeholder="name@example.com" />
          <TextField label="Joined on" type="date" defaultValue={isoIn(0)} />
          <SelectField label="Plan" defaultValue="quarterly">
            {PLANS.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} · {formatINR(plan.price)}
              </option>
            ))}
          </SelectField>
          <TextField label="Amount received" prefix="₹" inputMode="decimal" defaultValue="3000" />
          <Segmented label="Duration" name="duration" options={DURATIONS} value={duration} onChange={setDuration} />
          <Segmented
            label="Paid by"
            name="method"
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'upi', label: 'UPI' },
              { value: 'card', label: 'Card' },
            ]}
            value={method}
            onChange={setMethod}
          />
        </form>
      </Section>

      <Section
        title="Expiry board"
        note="The Today screen's core. Renew opens in place; the rest of the board steps back. Try it."
      >
        <Board />
      </Section>

      <Section title="Empty and error" note="Empty explains what will appear. Errors name the failure and the way out.">
        <div className="grid gap-6 md:grid-cols-2">
          <Notice title="No one expires this week.">
            Members whose plan ends in the next 7 days show up here, with a Renew button on each.
          </Notice>
          <Notice
            tone="error"
            title="Couldn't load expiring memberships."
            action={<Button size="sm">Retry</Button>}
          >
            The server didn't respond. Check the connection, then retry.
          </Notice>
        </div>
      </Section>

      <footer className="border-t border-rule py-10 text-[0.8125rem] text-fg-muted">
        Dynamic Gym owner app · design system
      </footer>
    </div>
  )
}
