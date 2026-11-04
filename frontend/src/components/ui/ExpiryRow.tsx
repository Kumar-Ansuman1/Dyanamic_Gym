import { TriangleAlert } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { addDays, formatINR, formatShortDate, PAYMENT_METHODS } from '../../lib/formatters.ts'
import type { PaymentMethod } from '../../types/api.ts'
import { Button } from './Button.tsx'
import { SelectField, Segmented, TextField } from './Field.tsx'
import { DaysLeft } from './Segment.tsx'
import { UrgencyTag, urgencyOf } from './Status.tsx'

export type RenewPlan = { id: string; name: string; price: string }

export type RenewInput = { planId: string; amount: string; method: PaymentMethod; reference: string }

type RenewFormProps = {
  /** Member name, for the form's accessible label. */
  name: string
  plans: RenewPlan[]
  planId: string
  /** "New period starts Sat, 1 Nov". */
  note: string
  /** First word of the confirm button: "Renew and record ₹3,000". */
  verb?: string
  pending?: boolean
  error?: string | null
  onSubmit: (input: RenewInput) => void
  onCancel: () => void
}

// Plan, amount, method, one confirm. Opens in place under an expiry row or a member header.
export function RenewForm({ name, plans, planId, note, verb = 'Renew', pending = false, error = null, onSubmit, onCancel }: RenewFormProps) {
  const methodName = useId()
  const [selectedPlan, setSelectedPlan] = useState(planId)
  const [amount, setAmount] = useState(plans.find((p) => p.id === planId)?.price ?? '')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')

  const choosePlan = (id: string) => {
    setSelectedPlan(id)
    setAmount(plans.find((p) => p.id === id)?.price ?? '')
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({ planId: selectedPlan, amount, method, reference })
  }

  return (
    <form
      onSubmit={submit}
      aria-label={`${verb} ${name}`}
      className="grid gap-5 border-t border-rule px-4 pt-5 pb-6 md:grid-cols-2 md:gap-x-6"
    >
      <SelectField label="Plan" value={selectedPlan} onChange={(e) => choosePlan(e.target.value)}>
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.name} · {formatINR(plan.price)}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Amount received"
        prefix="₹"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        hint="Leave the full price unless they pay part now."
      />
      <Segmented label="Paid by" name={methodName} options={PAYMENT_METHODS} value={method} onChange={setMethod} />
      <TextField
        label="Reference (optional)"
        placeholder="UPI ref or receipt no."
        value={reference}
        onChange={(e) => setReference(e.target.value)}
      />
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-[0.8125rem] text-led md:col-span-2">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 md:col-span-2">
        <Button variant="primary" type="submit" loading={pending}>
          {verb} and record {formatINR(amount || 0)}
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          Not now
        </Button>
        <p className="text-[0.8125rem] text-fg-muted">{note}</p>
      </div>
    </form>
  )
}

type ExpiryRowProps = {
  /** DOM id on the row, for scrolling it into view. */
  id?: string
  name: string
  code: string
  planName: string
  planId: string
  endDate: string
  daysLeft: number
  plans: RenewPlan[]
  open: boolean
  /** Another row is open: this one steps back. */
  dimmed?: boolean
  pending?: boolean
  /** Why the last renew attempt failed; shown above the confirm button. */
  error?: string | null
  onToggle: () => void
  onRenew: (input: RenewInput) => void
}

// A row on the expiry board. Renew opens in place: plan, amount, method, one confirm.
export function ExpiryRow({
  id,
  name,
  code,
  planName,
  planId,
  endDate,
  daysLeft,
  plans,
  open,
  dimmed = false,
  pending = false,
  error = null,
  onToggle,
  onRenew,
}: ExpiryRowProps) {
  const panelId = useId()
  // Red fill only where the ramp says act now; a whole board of red buttons says nothing.
  const urgent = urgencyOf(daysLeft)

  return (
    <li
      id={id}
      className={`scroll-mt-24 border-b border-rule transition-[opacity,background-color] duration-300 ${open ? 'bg-raised' : ''} ${dimmed ? 'opacity-40' : ''}`}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-3 md:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_9rem_auto] md:gap-x-6">
        <DaysLeft days={daysLeft} className="text-[1.75rem] md:text-[2rem]" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-[0.8125rem] tracking-[0.04em] text-fg-muted tabular-nums">
            {code}
            <span className="md:hidden"> · {planName}</span>
          </p>
          <div className="mt-0.5 md:hidden">
            <UrgencyTag days={daysLeft} />
          </div>
        </div>
        <div className="hidden min-w-0 md:block">
          <p className="truncate">{planName}</p>
          <p className="text-[0.8125rem] text-fg-muted">
            {daysLeft < 0 ? 'Ended' : 'Ends'} {formatShortDate(endDate)}
          </p>
        </div>
        <div className="hidden md:block">
          <UrgencyTag days={daysLeft} />
        </div>
        <Button
          variant={!open && (urgent === 'today' || urgent === 'soon') ? 'primary' : 'secondary'}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          {open ? 'Close' : 'Renew'}
        </Button>
      </div>

      <div
        id={panelId}
        inert={!open}
        className={`grid transition-[grid-template-rows] duration-300 ease-out-expo ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <RenewForm
            name={name}
            plans={plans}
            planId={planId}
            note={`New period starts ${daysLeft < 0 ? 'today' : formatShortDate(addDays(endDate, 1))}`}
            pending={pending}
            error={error}
            onSubmit={onRenew}
            onCancel={onToggle}
          />
        </div>
      </div>
    </li>
  )
}
