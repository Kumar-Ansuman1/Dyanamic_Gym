import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Page } from '../../components/layout/Page.tsx'
import { BOARD, HEADER_BAR } from '../../components/layout/Section.tsx'
import { Button, buttonClass } from '../../components/ui/Button.tsx'
import { Segmented, TextField } from '../../components/ui/Field.tsx'
import { Notice } from '../../components/ui/Notice.tsx'
import { api, errorMessage } from '../../lib/api-client.ts'
import { formatINR, formatMonths, formatPeriod, formatShortDate, PAYMENT_METHODS, toISODate } from '../../lib/formatters.ts'
import type { Member, Payment, PaymentMethod, Subscription } from '../../types/api.ts'
import { activePlansQuery } from '../subscriptions/collect.ts'
import { MemberForm, toMemberBody, type MemberValues } from './MemberForm.tsx'

const STEPS = ['Details', 'Plan', 'Payment', 'Receipt'] as const
const AMOUNT = /^\d+(\.\d{1,2})?$/

function Steps({ current }: { current: number }) {
  return (
    <ol aria-label="Steps" className="grid grid-cols-4 border border-rule">
      {STEPS.map((step, i) => (
        <li
          key={step}
          aria-current={i === current ? 'step' : undefined}
          className={`label-panel flex items-center gap-2 border-l border-rule px-3 py-2.5 first:border-l-0 md:px-4 ${
            i === current ? 'bg-raised text-fg' : i < current ? 'text-fg-muted' : 'text-fg-faint'
          }`}
        >
          <span className="tabular-nums">{i + 1}</span>
          <span className="sr-only sm:not-sr-only">{step}</span>
        </li>
      ))}
    </ol>
  )
}

/** A finished step, collapsed to one line. */
function Done({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-rule px-4 py-3 md:flex-row md:items-baseline md:gap-6">
      <span className="label-panel w-20 shrink-0 text-fg-faint">{label}</span>
      <span className="min-w-0 tabular-nums">{children}</span>
    </div>
  )
}

function StepPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="bg-raised">
      <h2 className={HEADER_BAR}>
        <span className="label-panel">{title}</span>
      </h2>
      <div className="px-4 pt-5 pb-6">{children}</div>
    </section>
  )
}

/** A later step failed: say the earlier ones stuck, then what to do. */
function StepError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-[0.8125rem] text-led md:col-span-2">
      {children}
    </p>
  )
}

export function NewMemberPage() {
  const queryClient = useQueryClient()
  const today = toISODate(new Date())
  const [member, setMember] = useState<Member | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [payment, setPayment] = useState<Payment | 'later' | null>(null)
  const [planId, setPlanId] = useState<string | null>(null)
  const [startsOn, setStartsOn] = useState(today)
  const [amountText, setAmountText] = useState<string | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)

  const plans = useQuery(activePlansQuery)
  const plan = plans.data?.find((p) => p.id === planId) ?? plans.data?.[0]
  const step = !member ? 0 : !subscription ? 1 : payment === null ? 2 : 3

  const register = useMutation({
    mutationFn: (values: MemberValues) => api.post<Member>('/members', toMemberBody(values)).then((r) => r.data),
    onSuccess: (created) => {
      setMember(created)
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  const start = useMutation({
    mutationFn: () =>
      api
        .post<Subscription>('/subscriptions', { member_id: member!.id, plan_id: plan!.id, start_date: startsOn })
        .then((r) => r.data),
    onSuccess: (created) => {
      setSubscription(created)
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })

  const amount = amountText ?? subscription?.price.replace(/\.00$/, '') ?? ''
  const pay = useMutation({
    mutationFn: () =>
      api
        .post<Payment>('/payments', {
          member_id: member!.id,
          amount: amount.trim(),
          method,
          reference: reference.trim() || null,
          allocations: [{ subscription_id: subscription!.id, amount: amount.trim() }],
        })
        .then((r) => r.data),
    onSuccess: (recorded) => {
      setPayment(recorded)
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  })

  const reset = () => {
    setMember(null)
    setSubscription(null)
    setPayment(null)
    setPlanId(null)
    setStartsOn(today)
    setAmountText(null)
    setReference('')
    register.reset()
    start.reset()
    pay.reset()
  }

  // A 409 means the phone is already on file; the backend's Location header names that member.
  const conflict = isAxiosError(register.error) && register.error.response?.status === 409 ? register.error.response : null
  const duplicateOf = conflict ? String(conflict.headers.location ?? '').split('/').pop() : null

  const submitPayment = (event: FormEvent) => {
    event.preventDefault()
    const value = amount.trim()
    const problem =
      !AMOUNT.test(value) || Number(value) <= 0
        ? 'Enter the amount as a number, like 3000. To take nothing now, use Collect later.'
        : Number(value) > Number(subscription!.price)
          ? `That's more than the ${formatINR(subscription!.price)} plan price. Lower the amount.`
          : null
    setAmountError(problem)
    if (!problem) pay.mutate()
  }

  const saved = member ? `${member.full_name} is saved as ${member.member_code}.` : ''
  const paid = payment && payment !== 'later' ? Number(payment.amount) : 0
  const due = subscription ? Number(subscription.price) - paid : 0

  return (
    <Page title="New member" back={{ to: '/members', label: 'Members' }}>
      <div className="flex max-w-3xl flex-col gap-4 lg:gap-6">
        <Steps current={step} />

        <div className={BOARD}>
          {member && (
            <Done label="Member">
              <span className="font-semibold">{member.full_name}</span>
              <span className="text-fg-muted">
                {' '}
                · {member.member_code} · {member.phone}
              </span>
            </Done>
          )}
          {subscription && (
            <Done label="Plan">
              <span className="font-semibold">{subscription.plan_name_snapshot}</span>
              <span className="text-fg-muted">
                {' '}
                · {formatINR(subscription.price)} · {formatPeriod(subscription.start_date, subscription.end_date)}
              </span>
            </Done>
          )}

          {step === 0 && (
            <StepPanel title="Their details">
              <MemberForm
                defaultValues={{ full_name: '', phone: '', email: '', joined_on: today }}
                submitLabel="Save and choose a plan"
                pending={register.isPending}
                error={
                  register.isError && (
                    <>
                      {errorMessage(register.error)}
                      {duplicateOf && (
                        <>
                          {' '}
                          <Link to={`/members/${duplicateOf}`} className="font-semibold text-fg underline">
                            Open their page
                          </Link>
                        </>
                      )}
                    </>
                  )
                }
                onSubmit={(values) => register.mutate(values)}
              />
            </StepPanel>
          )}

          {step === 1 && (
            <StepPanel title="Choose a plan">
              {plans.isPending ? (
                <p className="text-sm text-fg-muted">Loading plans…</p>
              ) : plans.isError ? (
                <Notice
                  tone="error"
                  title="Couldn't load the plans."
                  action={
                    <Button size="sm" onClick={() => plans.refetch()}>
                      Retry
                    </Button>
                  }
                >
                  {saved} {errorMessage(plans.error)}
                </Notice>
              ) : !plan ? (
                <Notice
                  title="No active plans."
                  action={
                    <Link to="/plans" className={buttonClass('secondary', 'sm')}>
                      Open Plans
                    </Link>
                  }
                >
                  {saved} Create or activate a plan, then start it from their page.
                </Notice>
              ) : (
                <form
                  className="flex flex-col gap-5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    start.mutate()
                  }}
                >
                  <fieldset className="flex flex-col">
                    <legend className="mb-1.5 text-[0.8125rem] font-medium text-fg-muted">Plan</legend>
                    <div className="border border-rule bg-ink">
                      {plans.data.map((p) => {
                        const on = p.id === plan.id
                        return (
                          <label
                            key={p.id}
                            className={`grid cursor-pointer grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-rule px-3.5 py-3 first:border-t-0 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-fg md:px-4 ${on ? 'bg-raised' : 'hover:bg-raised'}`}
                          >
                            <input type="radio" name="plan" checked={on} onChange={() => setPlanId(p.id)} className="sr-only" />
                            <span aria-hidden className={`flex size-4 items-center justify-center border ${on ? 'border-led' : 'border-rule-strong'}`}>
                              {on && <span className="size-2 bg-led" />}
                            </span>
                            <span className="min-w-0">
                              <span className="font-semibold">{p.name}</span>
                              <span className="text-fg-muted"> · {formatMonths(p.duration_months)}</span>
                            </span>
                            <span className="font-semibold tabular-nums">{formatINR(p.price)}</span>
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                  <div className="md:max-w-60">
                    <TextField label="Starts on" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
                  </div>
                  {start.isError && (
                    <StepError>
                      {saved} Starting the plan didn't work: {errorMessage(start.error)}
                    </StepError>
                  )}
                  <div>
                    <Button variant="primary" type="submit" loading={start.isPending} disabled={!startsOn}>
                      Start {plan.name}
                    </Button>
                  </div>
                </form>
              )}
            </StepPanel>
          )}

          {step === 2 && subscription && (
            <StepPanel title="Take payment">
              <form className="grid gap-5 md:grid-cols-2 md:gap-x-6" onSubmit={submitPayment} noValidate>
                <TextField
                  label="Amount received"
                  prefix="₹"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amount}
                  onChange={(e) => setAmountText(e.target.value)}
                  hint={`${formatINR(subscription.price)} for ${subscription.plan_name_snapshot}. Enter less if they pay part now.`}
                  error={amountError ?? undefined}
                />
                <TextField
                  label="Reference (optional)"
                  placeholder="UPI ref or receipt no."
                  autoComplete="off"
                  maxLength={255}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                <div className="md:col-span-2">
                  <Segmented label="Paid by" name="walk-in-method" options={PAYMENT_METHODS} value={method} onChange={setMethod} />
                </div>
                {pay.isError && (
                  <StepError>
                    {saved} {subscription.plan_name_snapshot} has started. The payment wasn't recorded: {errorMessage(pay.error)} Or
                    collect later.
                  </StepError>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3 md:col-span-2">
                  <Button variant="primary" type="submit" loading={pay.isPending}>
                    Record {formatINR(AMOUNT.test(amount.trim()) ? amount : 0)}
                  </Button>
                  <Button variant="quiet" disabled={pay.isPending} onClick={() => setPayment('later')}>
                    Collect later
                  </Button>
                </div>
              </form>
            </StepPanel>
          )}

          {step === 3 && member && subscription && (
            <section aria-label="Receipt" className="bg-panel">
              <div className="flex flex-col gap-1 border-b border-rule px-4 pt-5 pb-4">
                <span className="label-panel text-fg-muted">Member code</span>
                <span className="text-[3rem] leading-none font-bold tracking-[0.02em] tabular-nums md:text-[3.5rem]">{member.member_code}</span>
                <span className="mt-1 text-lg font-semibold">{member.full_name}</span>
              </div>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 px-4 py-4 text-sm [&_dd]:text-right [&_dd]:tabular-nums [&_dt]:text-fg-muted">
                <dt>Plan</dt>
                <dd>
                  {subscription.plan_name_snapshot} · {formatINR(subscription.price)}
                </dd>
                <dt>Period</dt>
                <dd>
                  {formatShortDate(subscription.start_date)} → {formatShortDate(subscription.end_date)}
                </dd>
                <dt>Paid</dt>
                <dd>{formatINR(paid)}</dd>
              </dl>
              <p className={`flex justify-between gap-4 border-t border-rule px-4 py-3 font-semibold tabular-nums ${due > 0 ? 'text-led' : ''}`}>
                <span>{due > 0 ? 'Still due' : 'Paid in full'}</span>
                <span>{formatINR(due > 0 ? due : subscription.price)}</span>
              </p>
              <div className="grid grid-cols-2 gap-2 border-t border-rule px-4 py-4 md:flex md:gap-3">
                <Link to={`/members/${member.id}`} className={buttonClass('secondary', 'md', 'w-full md:w-auto')}>
                  Open {member.full_name}
                </Link>
                <Button className="w-full md:w-auto" onClick={reset}>
                  Register another
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </Page>
  )
}
