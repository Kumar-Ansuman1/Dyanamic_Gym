import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Page } from '../../components/layout/Page.tsx'
import { Button, buttonClass } from '../../components/ui/Button.tsx'
import { Segmented, TextField } from '../../components/ui/Field.tsx'
import { Notice } from '../../components/ui/Notice.tsx'
import { PaymentStatusMark, SubscriptionStatusMark } from '../../components/ui/Status.tsx'
import { api, errorMessage, getPage } from '../../lib/api-client.ts'
import { formatINR, formatPeriod, formatShortDate, methodLabel, PAYMENT_METHODS, toISODate, toPaidAt } from '../../lib/formatters.ts'
import type { Member, Payment, PaymentMethod, Subscription } from '../../types/api.ts'
import { MemberPicker } from '../members/MemberPicker.tsx'

const AMOUNT = /^\d+(\.\d{1,2})?$/
const plain = (amount: string) => amount.replace(/\.00$/, '')

type Recorded = { payment: Payment; member: Member; subscription: Subscription; balanceAfter: number }

/** The receipt stub: live while filling in, then the confirmation. */
function Receipt({
  member,
  subscription,
  amount,
  over,
  method,
  reference,
  paidOn,
  balanceAfter,
  done,
  onAnother,
}: {
  member: Member | null
  subscription: Subscription | undefined
  amount: number
  over: boolean
  method: PaymentMethod
  reference: string
  paidOn: string
  balanceAfter: number
  done: boolean
  onAnother: () => void
}) {
  return (
    <aside aria-label={done ? 'Payment recorded' : 'Receipt'} className="border border-rule bg-panel lg:sticky lg:top-6">
      {done ? (
        <div className="flex items-center justify-between gap-4 border-b border-rule px-4 py-3.5 lg:px-5 lg:py-4">
          <span className="text-lg font-bold tracking-[-0.01em] lg:text-xl">Payment recorded</span>
          <PaymentStatusMark status="recorded" />
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-rule px-5 py-2.5 text-fg-muted">
          <span className="label-panel">Receipt</span>
          <span className="text-[0.8125rem] tabular-nums">{formatShortDate(paidOn)}</span>
        </div>
      )}
      {member && subscription ? (
        <div className="flex flex-col gap-3 p-4 lg:gap-4 lg:p-5">
          <div className="flex flex-wrap items-baseline gap-x-2.5 lg:flex-col lg:gap-1">
            <span className="font-semibold lg:text-[1.0625rem]">{member.full_name}</span>
            <span className="text-[0.8125rem] text-fg-muted tabular-nums lg:text-sm">{member.member_code}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="label-panel hidden text-fg-faint lg:block">Applied to</span>
            <span className="text-sm tabular-nums lg:text-[0.9375rem]">
              {subscription.plan_name_snapshot} · {formatPeriod(subscription.start_date, subscription.end_date)}
            </span>
          </div>
          <p
            className={`border-y border-rule py-2.5 text-[2.75rem] leading-none font-bold tracking-[-0.03em] tabular-nums lg:py-3 lg:text-[3.5rem] ${over ? 'text-led' : ''}`}
          >
            {formatINR(amount)}
          </p>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm [&_dd]:text-right [&_dt]:text-fg-muted">
            <dt>Method</dt>
            <dd>{methodLabel(method)}</dd>
            <dt>Reference</dt>
            <dd className="truncate tabular-nums">{reference.trim() || '—'}</dd>
            <dt>Paid on</dt>
            <dd className="tabular-nums">{formatShortDate(paidOn)}</dd>
          </dl>
          <p className="flex justify-between gap-4 border-t border-rule pt-3 text-[0.9375rem] font-semibold tabular-nums">
            <span>Balance after</span>
            <span className={balanceAfter < 0 ? 'text-led' : ''}>
              {balanceAfter < 0 ? `${formatINR(-balanceAfter)} over` : formatINR(balanceAfter)}
            </span>
          </p>
          {done && (
            <div className="grid grid-cols-2 gap-2 pt-1 lg:flex lg:flex-wrap lg:gap-3">
              <Button className="w-full lg:w-auto" onClick={onAnother} autoFocus>
                Record another
              </Button>
              <Link to={`/members/${member.id}`} className={buttonClass('secondary', 'md', 'w-full lg:w-auto')}>
                Open {member.full_name}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <p className="p-5 text-sm text-fg-muted">{member ? 'Choose what the payment is for.' : 'Choose a member to start the receipt.'}</p>
      )}
    </aside>
  )
}

export function RecordPaymentPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const today = toISODate(new Date())
  const memberParam = params.get('member')
  const subscriptionParam = params.get('subscription')

  // undefined: nobody picked yet, so the member from the link (if any) stands.
  const [picked, setPicked] = useState<Member | null | undefined>(undefined)
  const [subscriptionId, setSubscriptionId] = useState<string | null>(subscriptionParam)
  // null: use the selected membership's balance.
  const [amountText, setAmountText] = useState<string | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [paidOn, setPaidOn] = useState(today)
  const [recorded, setRecorded] = useState<Recorded | null>(null)

  const linkedSubscription = useQuery({
    queryKey: ['subscriptions', subscriptionParam],
    queryFn: () => api.get<Subscription>(`/subscriptions/${subscriptionParam}`).then((r) => r.data),
    enabled: !memberParam && !!subscriptionParam,
  })
  const linkedMemberId = memberParam ?? linkedSubscription.data?.member_id
  const linkedMember = useQuery({
    queryKey: ['members', linkedMemberId],
    queryFn: () => api.get<Member>(`/members/${linkedMemberId}`).then((r) => r.data),
    enabled: !!linkedMemberId && picked === undefined,
  })
  const member = picked === undefined ? (linkedMember.data ?? null) : picked

  const owed = useQuery({
    queryKey: ['subscriptions', 'owed', member?.id],
    queryFn: () => getPage<Subscription>('/subscriptions', { member_id: member!.id, has_balance: true, limit: 100 }),
    // Oldest debt first: that's the one to clear.
    select: (page) => [...page.rows].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    enabled: !!member,
  })
  const subscriptions = owed.data ?? []
  const subscription = subscriptions.find((s) => s.id === subscriptionId) ?? subscriptions[0]
  const amount = amountText ?? (subscription ? plain(subscription.balance_due) : '')
  const due = Number(subscription?.balance_due ?? 0)
  const valid = AMOUNT.test(amount.trim()) && Number(amount) > 0
  const value = valid ? Number(amount) : 0
  const over = valid && value > due
  const other = subscriptions.find((s) => s !== subscription)

  const amountError = over
    ? `That's more than the ${formatINR(due)} due. Lower the amount${
        other ? `, or apply the rest to the ${other.status === 'pending' ? 'upcoming ' : ''}${other.plan_name_snapshot} plan` : ''
      }.`
    : amount.trim() && !valid
      ? 'Enter the amount as a number, like 600.'
      : undefined
  const dateError = !paidOn ? 'Pick the day it was paid.' : paidOn > today ? "Paid on can't be in the future." : undefined

  const record = useMutation({
    mutationFn: () =>
      api
        .post<Payment>('/payments', {
          member_id: member!.id,
          amount: amount.trim(),
          method,
          reference: reference.trim() || null,
          paid_at: paidOn === today ? new Date().toISOString() : toPaidAt(paidOn),
          allocations: [{ subscription_id: subscription!.id, amount: amount.trim() }],
        })
        .then((r) => r.data),
    onSuccess: (payment) => {
      setRecorded({ payment, member: member!, subscription: subscription!, balanceAfter: due - value })
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  })

  const pick = (next: Member | null) => {
    setPicked(next)
    setSubscriptionId(null)
    setAmountText(null)
    record.reset()
  }

  const startAnother = () => {
    setRecorded(null)
    pick(null)
    setReference('')
    setPaidOn(today)
  }

  const blocked = !member || !member.is_active || !subscription || !valid || over || !!dateError
  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!blocked && !record.isPending) record.mutate()
  }

  const receipt = (
    <Receipt
      member={recorded?.member ?? member}
      subscription={recorded?.subscription ?? subscription}
      amount={recorded ? Number(recorded.payment.amount) : value}
      over={!recorded && over}
      method={recorded?.payment.method ?? method}
      reference={recorded ? (recorded.payment.reference ?? '') : reference}
      paidOn={paidOn}
      balanceAfter={recorded ? recorded.balanceAfter : due - value}
      done={!!recorded}
      onAnother={startAnother}
    />
  )
  const loadingLink = picked === undefined && !!(memberParam || subscriptionParam) && !linkedMember.data && !linkedMember.isError
  const recordLabel = `Record ${formatINR(value)}`
  const networkDown = record.isError && isAxiosError(record.error) && !record.error.response
  const ready = member && member.is_active && subscription && !recorded

  return (
    <Page title="Record payment" back={{ to: '/payments', label: 'Payments' }}>
      <div className={`grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-10 ${ready ? 'pb-24 lg:pb-0' : ''}`}>
        {recorded && <div className="lg:hidden">{receipt}</div>}

        <form
          onSubmit={submit}
          noValidate
          inert={!!recorded}
          className={`flex flex-col gap-6 transition-opacity duration-300 lg:gap-7 ${recorded ? 'hidden opacity-40 lg:flex' : ''}`}
        >
          {loadingLink ? (
            <p aria-busy className="text-sm text-fg-muted">
              Loading the member…
            </p>
          ) : (
            <MemberPicker member={member} onChange={pick} />
          )}

          {member && !member.is_active && (
            <Notice
              title={`${member.full_name} is inactive.`}
              action={
                <Link to={`/members/${member.id}`} className={buttonClass('secondary', 'sm')}>
                  Open {member.full_name}
                </Link>
              }
            >
              Activate them on their page before recording a payment.
            </Notice>
          )}

          {member?.is_active && owed.isPending && <p className="text-sm text-fg-muted">Checking what they owe…</p>}
          {member && owed.isError && (
            <Notice
              tone="error"
              title="Couldn't load what they owe."
              action={
                <Button size="sm" onClick={() => owed.refetch()}>
                  Retry
                </Button>
              }
            >
              {errorMessage(owed.error)}
            </Notice>
          )}
          {member?.is_active && owed.isSuccess && subscriptions.length === 0 && (
            <Notice
              title={`Nothing is due for ${member.full_name}.`}
              action={
                <Link to={`/members/${member.id}`} className={buttonClass('secondary', 'sm')}>
                  Open {member.full_name}
                </Link>
              }
            >
              Every membership is paid in full. To take money for a new period, renew from their page.
            </Notice>
          )}

          {member?.is_active && subscription && (
            <>
              <fieldset className="flex min-w-0 flex-col">
                <legend className="mb-1.5 text-[0.8125rem] font-medium text-fg-muted">Apply to</legend>
                <div className="border border-rule">
                  {subscriptions.map((s) => {
                    const on = s.id === subscription.id
                    const period = s.status === 'pending' ? `from ${formatShortDate(s.start_date)}` : formatPeriod(s.start_date, s.end_date)
                    return (
                      <label
                        key={s.id}
                        className={`grid cursor-pointer grid-cols-[1rem_minmax(0,1fr)] items-start gap-3 border-t border-rule px-3.5 py-3 first:border-t-0 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-fg md:grid-cols-[1rem_minmax(0,1fr)_auto] md:items-center md:gap-3.5 md:px-4 md:py-3.5 ${on ? 'bg-raised' : 'hover:bg-raised'}`}
                      >
                        <input
                          type="radio"
                          name="apply-to"
                          value={s.id}
                          checked={on}
                          onChange={() => {
                            setSubscriptionId(s.id)
                            setAmountText(null)
                          }}
                          className="sr-only"
                        />
                        <span aria-hidden className={`mt-0.5 flex size-4 items-center justify-center border md:mt-0 ${on ? 'border-led' : 'border-rule-strong'}`}>
                          {on && <span className="size-2 bg-led" />}
                        </span>
                        {/* Phone: plan and amount, then period and status. Desktop: one line, status on the right. */}
                        <span className="flex min-w-0 flex-col gap-1 tabular-nums md:hidden">
                          <span className="flex justify-between gap-2">
                            <span className="font-semibold">{s.plan_name_snapshot}</span>
                            <span className="font-semibold">{formatINR(s.balance_due)} due</span>
                          </span>
                          <span className="flex items-center justify-between gap-2 text-[0.8125rem] text-fg-muted">
                            {period}
                            <SubscriptionStatusMark status={s.status} />
                          </span>
                        </span>
                        <span className="hidden min-w-0 tabular-nums md:inline">
                          <span className="font-semibold">{s.plan_name_snapshot}</span>
                          <span className="text-fg-muted"> · {period} · </span>
                          <span className="font-semibold">{formatINR(s.balance_due)} due</span>
                        </span>
                        <span className="hidden md:block">
                          <SubscriptionStatusMark status={s.status} />
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <div className="md:max-w-80">
                <TextField
                  label="Amount received"
                  prefix="₹"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amount}
                  onChange={(e) => setAmountText(e.target.value)}
                  hint={`${formatINR(due)} due on this membership.`}
                  error={amountError}
                />
              </div>

              <div className="flex flex-col gap-5">
                <Segmented label="Paid by" name="paid-by" options={PAYMENT_METHODS} value={method} onChange={setMethod} />
                <div className="grid gap-5 md:grid-cols-2">
                  <TextField
                    label="Reference (optional)"
                    placeholder="UPI ref or receipt no."
                    autoComplete="off"
                    maxLength={255}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                  <TextField label="Paid on" type="date" max={today} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} error={dateError} />
                </div>
              </div>

              {record.isError && (
                <Notice
                  tone="error"
                  title="Couldn't record the payment."
                  action={
                    <Button size="sm" loading={record.isPending} onClick={() => submit()}>
                      Retry
                    </Button>
                  }
                >
                  {networkDown ? 'Nothing was saved. Check the connection and try again.' : errorMessage(record.error)}
                </Notice>
              )}

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:border-t lg:border-rule lg:pt-5">
                {/* Phones get this button in the sticky bar instead. */}
                <div className="hidden lg:block">
                  <Button variant="primary" type="submit" loading={record.isPending} disabled={blocked}>
                    {recordLabel}
                  </Button>
                </div>
                <Button variant="quiet" className="w-full lg:w-auto" onClick={() => navigate(`/members/${member.id}`)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </form>

        <div className="hidden lg:block">{receipt}</div>
      </div>

      {ready && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-3 border-t border-rule bg-panel px-4 py-3 lg:hidden">
          <div className="flex min-w-0 flex-col gap-0.5 tabular-nums">
            <span className={`truncate text-[1.0625rem] font-bold ${over ? 'text-led' : ''}`}>
              {formatINR(value)} to {subscription.plan_name_snapshot}
            </span>
            <span className="text-xs text-fg-muted">
              Balance after: {due - value < 0 ? `${formatINR(value - due)} over` : formatINR(due - value)}
            </span>
          </div>
          <Button variant="primary" loading={record.isPending} disabled={blocked} onClick={() => submit()}>
            {recordLabel}
          </Button>
        </div>
      )}
    </Page>
  )
}
