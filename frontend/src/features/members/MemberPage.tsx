import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { DataTable, StackedRow } from '../../components/layout/List.tsx'
import { Page } from '../../components/layout/Page.tsx'
import { BOARD, Outcome, Section, type OutcomeText } from '../../components/layout/Section.tsx'
import { Button, buttonClass, ConfirmButton } from '../../components/ui/Button.tsx'
import { RenewForm, type RenewInput } from '../../components/ui/ExpiryRow.tsx'
import { Notice } from '../../components/ui/Notice.tsx'
import { DaysLeft } from '../../components/ui/Segment.tsx'
import { MemberStatusMark, PaymentStatusMark, SubscriptionStatusMark, UrgencyTag } from '../../components/ui/Status.tsx'
import { api, errorMessage, getPage } from '../../lib/api-client.ts'
import {
  addDays,
  daysUntil,
  formatDate,
  formatDay,
  formatINR,
  formatPeriod,
  formatShortDate,
  methodLabel,
  toISODate,
} from '../../lib/formatters.ts'
import type { Member, Payment, Subscription } from '../../types/api.ts'
import {
  checkRenewInput,
  PaymentNotRecorded,
  renewAndCollect,
  renewedText,
  startAndCollect,
  usePlanOptions,
} from '../subscriptions/collect.ts'
import { MemberForm, toMemberBody, type MemberValues } from './MemberForm.tsx'

const owes = (s: Subscription) => s.status !== 'cancelled' && Number(s.balance_due) > 0

function CurrentMembership({ current, dimmed }: { current: Subscription; dimmed: boolean }) {
  const days = daysUntil(current.end_date)
  const tag = current.status === 'pending' ? <SubscriptionStatusMark status="pending" /> : <UrgencyTag days={days} />

  return (
    <section
      aria-label="Current membership"
      className={`-mx-4 border-y border-rule bg-panel lg:mx-0 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:border ${dimmed ? 'opacity-60' : ''}`}
    >
      <div className="hidden flex-col gap-3 border-r border-rule px-8 pt-6 pb-7 lg:flex">
        <span className="label-panel text-fg-muted">Days left</span>
        <DaysLeft days={days} className="text-[7.5rem]" />
      </div>
      <div className="flex min-w-0 flex-col gap-3.5 p-4 lg:justify-between lg:gap-5 lg:px-8 lg:pt-6 lg:pb-7">
        <div className="flex flex-col gap-3.5 lg:gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="label-panel text-fg-muted">Current membership</span>
            {tag}
          </div>
          <div className="flex items-end gap-5 lg:items-baseline lg:gap-3.5">
            <DaysLeft days={days} className="text-[5.5rem] lg:hidden" />
            <div className="flex min-w-0 flex-col gap-1 pb-1 lg:flex-row lg:flex-wrap lg:items-baseline lg:gap-3.5 lg:pb-0">
              <span className="text-xl font-bold lg:text-2xl lg:tracking-[-0.01em]">{current.plan_name_snapshot}</span>
              <span className="text-[0.9375rem] text-fg-muted tabular-nums lg:text-lg">{formatINR(current.price)}</span>
            </div>
          </div>
          <span className="text-sm tabular-nums lg:text-[0.9375rem]">
            {formatDate(current.start_date)} → {formatDate(current.end_date)}
          </span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-t border-rule pt-3 lg:justify-start lg:pt-4">
          <span className="text-sm tabular-nums lg:text-[0.9375rem]">
            Paid {formatINR(current.amount_paid)} of {formatINR(current.price)}
          </span>
          {Number(current.balance_due) > 0 && (
            <span className="text-[1.0625rem] font-bold text-led tabular-nums lg:text-lg">{formatINR(current.balance_due)} due</span>
          )}
        </div>
      </div>
    </section>
  )
}

function History({ subscriptions, payments }: { subscriptions: Subscription[]; payments: Payment[] }) {
  return (
    <>
      <div className={BOARD}>
        <Section title="Subscriptions" count={subscriptions.length} first>
          {subscriptions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-fg-muted">No subscriptions yet.</p>
          ) : (
            <DataTable
              label="Subscriptions"
              rows={subscriptions}
              rowKey={(s) => s.id}
              columns={[
                { header: 'Plan', className: 'w-[28%] font-semibold', cell: (s) => s.plan_name_snapshot },
                { header: 'Period', className: 'text-fg-muted tabular-nums', cell: (s) => formatPeriod(s.start_date, s.end_date) },
                { header: 'Price', className: 'w-[16%] text-right tabular-nums', cell: (s) => formatINR(s.price) },
                { header: 'Status', className: 'w-[18%]', cell: (s) => <SubscriptionStatusMark status={s.status} /> },
              ]}
              mobileRow={(s) => (
                <StackedRow
                  title={s.plan_name_snapshot}
                  value={formatINR(s.price)}
                  meta={formatPeriod(s.start_date, s.end_date)}
                  status={<SubscriptionStatusMark status={s.status} />}
                />
              )}
            />
          )}
        </Section>
      </div>

      <div className={BOARD}>
        <Section title="Payments" count={payments.length} first>
          {payments.length === 0 ? (
            <p className="px-4 py-3 text-sm text-fg-muted">No payments yet.</p>
          ) : (
            <DataTable
              label="Payments"
              rows={payments}
              rowKey={(p) => p.id}
              columns={[
                { header: 'Date', className: 'w-[22%] text-fg-muted tabular-nums', cell: (p) => formatDay(p.paid_at) },
                {
                  header: 'Amount',
                  className: 'w-[14%] text-right font-semibold tabular-nums',
                  cell: (p) => (
                    <Link to={`/payments/${p.id}`} className="hover:underline">
                      {formatINR(p.amount)}
                    </Link>
                  ),
                },
                { header: 'Method', className: 'w-[16%] pl-10!', cell: (p) => methodLabel(p.method) },
                { header: 'Reference', className: 'text-fg-muted tabular-nums', cell: (p) => p.reference ?? '—' },
                { header: 'Status', className: 'w-[18%]', cell: (p) => <PaymentStatusMark status={p.status} /> },
              ]}
              mobileRow={(p) => (
                <StackedRow
                  to={`/payments/${p.id}`}
                  title={formatINR(p.amount)}
                  meta={`${formatDay(p.paid_at)} · ${methodLabel(p.method)}${p.reference ? ` ${p.reference}` : ''}`}
                  status={<PaymentStatusMark status={p.status} />}
                />
              )}
            />
          )}
        </Section>
      </div>
    </>
  )
}

export function MemberPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [panel, setPanel] = useState<'renew' | 'edit' | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<OutcomeText>(null)

  const member = useQuery({ queryKey: ['members', id], queryFn: () => api.get<Member>(`/members/${id}`).then((r) => r.data) })
  // ponytail: one page of 100 covers years of monthly renewals; page these if a member ever passes it.
  const subscriptions = useQuery({
    queryKey: ['subscriptions', 'member', id],
    queryFn: () => getPage<Subscription>('/subscriptions', { member_id: id, limit: 100 }),
  })
  const payments = useQuery({
    queryKey: ['payments', 'member', id],
    queryFn: () => getPage<Payment>('/payments', { member_id: id, limit: 100 }),
  })
  const plans = usePlanOptions()

  const open = (next: typeof panel) => {
    setPanel(panel === next ? null : next)
    setFormError(null)
  }

  // Everything except this member's own record, which the mutation already wrote into the cache.
  const refreshLists = () => queryClient.invalidateQueries({ queryKey: ['members'], predicate: (q) => q.queryKey[1] !== id })

  const renew = useMutation({
    mutationFn: ({ input, from }: { input: RenewInput; from: Subscription | undefined }) =>
      from ? renewAndCollect({ subscription: from, input }) : startAndCollect({ member: member.data!, input }),
    onSuccess: (result, { from }) => {
      setOutcome({ tone: 'done', text: renewedText(result, from ? 'Renewed' : 'Started') })
      setPanel(null)
    },
    onError: (error) => {
      if (error instanceof PaymentNotRecorded) {
        setOutcome({ tone: 'warn', text: error.message })
        setPanel(null)
      } else {
        setFormError(errorMessage(error))
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  })

  const edit = useMutation({
    mutationFn: (values: MemberValues) => api.put<Member>(`/members/${id}`, toMemberBody(values)).then((r) => r.data),
    onSuccess: (saved) => {
      queryClient.setQueryData(['members', id], saved)
      refreshLists()
      setOutcome({ tone: 'done', text: `Saved ${saved.full_name}'s details.` })
      setPanel(null)
    },
    onError: (error) => setFormError(errorMessage(error)),
  })

  const setActive = useMutation({
    mutationFn: (isActive: boolean) => api.patch<Member>(`/members/${id}/status`, { is_active: isActive }).then((r) => r.data),
    onSuccess: (saved) => {
      queryClient.setQueryData(['members', id], saved)
      refreshLists()
      setOutcome({
        tone: 'done',
        text: saved.is_active
          ? `${saved.full_name} is active again.`
          : `${saved.full_name} is now inactive. Their history stays here.`,
      })
      setPanel(null)
    },
    onError: (error) => setOutcome({ tone: 'warn', text: `Couldn't change the status: ${errorMessage(error)}` }),
  })

  const queries = [member, subscriptions, payments, plans]
  const failed = queries.find((q) => q.isError)

  if (failed) {
    const missing = member.isError && isAxiosError(member.error) && member.error.response?.status === 404
    return (
      <Page title={missing ? 'Member not found' : 'Member'} back={{ to: '/members', label: 'Members' }}>
        {missing ? (
          <Notice
            title="That member doesn't exist."
            action={
              <Link to="/members" className={buttonClass('secondary', 'sm')}>
                All members
              </Link>
            }
          >
            The link may be old. Find them by name, phone or code instead.
          </Notice>
        ) : (
          <Notice
            tone="error"
            title="Couldn't load this member."
            action={
              <Button size="sm" onClick={() => queries.forEach((q) => q.isError && q.refetch())}>
                Retry
              </Button>
            }
          >
            {errorMessage(failed.error)}
          </Notice>
        )}
      </Page>
    )
  }

  if (queries.some((q) => q.isPending)) {
    return (
      <Page title="Member" back={{ to: '/members', label: 'Members' }}>
        <div aria-busy className="-mx-4 flex h-56 flex-col gap-3 border-y border-rule bg-panel p-4 lg:mx-0 lg:border lg:p-8">
          <span className="label-panel text-fg-muted">Loading</span>
          <span className="block h-4 w-48 bg-raised" />
          <span className="block h-3 w-32 bg-raised" />
        </div>
      </Page>
    )
  }

  const m = member.data!
  const rows = subscriptions.data!.rows
  const live = rows.filter((s) => s.status !== 'cancelled')
  const current = live.find((s) => s.status === 'active') ?? live.find((s) => s.status === 'pending') ?? live[0]
  // Renewals chain from the membership that ends last, so a second renewal never overlaps the first.
  const latest = [...live].sort((a, b) => b.end_date.localeCompare(a.end_date))[0]
  const owing = current && owes(current) ? current : live.find(owes)
  const today = toISODate(new Date())
  const startsOn = latest && addDays(latest.end_date, 1) > today ? addDays(latest.end_date, 1) : today
  const planOptions = plans.data!
  const renewLabel = latest ? 'Renew' : 'Start a plan'

  const renewButton = (variant: 'primary' | 'secondary') => (
    <Button
      variant={variant}
      className="w-full lg:w-auto"
      disabled={!m.is_active || planOptions.length === 0}
      aria-expanded={panel === 'renew'}
      onClick={() => open('renew')}
    >
      {renewLabel}
    </Button>
  )

  const actions = (
    <div className="flex flex-col gap-2 lg:items-end">
      <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center lg:gap-3">
        {!m.is_active ? (
          <>
            <div className="col-span-2">{renewButton('primary')}</div>
            <Button className="w-full lg:w-auto" loading={setActive.isPending} onClick={() => setActive.mutate(true)}>
              Activate
            </Button>
          </>
        ) : owing ? (
          <>
            <Link
              to={`/payments/new?member=${m.id}&subscription=${owing.id}`}
              className={buttonClass('primary', 'md', 'col-span-2 w-full lg:w-auto')}
            >
              Collect {formatINR(owing.balance_due)}
            </Link>
            {renewButton('secondary')}
          </>
        ) : (
          <>
            <div className="col-span-2">{renewButton('primary')}</div>
            <Link to={`/payments/new?member=${m.id}`} className={buttonClass('secondary', 'md', 'w-full lg:w-auto')}>
              Record payment
            </Link>
          </>
        )}
        <Button className="w-full lg:w-auto" aria-expanded={panel === 'edit'} onClick={() => open('edit')}>
          Edit
        </Button>
      </div>
      {!m.is_active && <span className="text-[0.8125rem] text-fg-muted">Activate the member to renew</span>}
    </div>
  )

  const meta = (
    <div className="flex flex-col gap-2 text-[0.8125rem] text-fg-muted lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-5 lg:text-sm">
      <div className="flex items-center gap-3 lg:contents">
        <span className="tabular-nums">{m.member_code}</span>
        <span className="text-fg lg:order-last">
          <MemberStatusMark active={m.is_active} />
        </span>
      </div>
      <div className="flex flex-col gap-0.5 lg:contents">
        <span className="tabular-nums">{m.phone}</span>
        {m.email && <span>{m.email}</span>}
      </div>
    </div>
  )

  return (
    <Page title={m.full_name} back={{ to: '/members', label: 'Members' }} meta={meta} actions={actions}>
      <Outcome outcome={outcome} />

      {panel === 'renew' && (
        <section aria-label={renewLabel} className={`${BOARD} bg-raised [&>form]:border-t-0`}>
          <RenewForm
            name={m.full_name}
            plans={planOptions}
            planId={planOptions.some((p) => p.id === latest?.plan_id) ? latest!.plan_id : planOptions[0].id}
            verb={latest ? 'Renew' : 'Start'}
            note={`New period starts ${startsOn === today ? 'today' : formatShortDate(startsOn)}`}
            pending={renew.isPending}
            error={formError}
            onSubmit={(input) => {
              const problem = checkRenewInput(input, planOptions)
              setFormError(problem)
              if (!problem) renew.mutate({ input, from: latest })
            }}
            onCancel={() => setPanel(null)}
          />
        </section>
      )}

      {panel === 'edit' && (
        <section aria-label="Edit details" className={`${BOARD} bg-raised px-4 pt-5 pb-6`}>
          <MemberForm
            defaultValues={{ full_name: m.full_name, phone: m.phone, email: m.email ?? '', joined_on: m.joined_on }}
            submitLabel="Save details"
            pending={edit.isPending}
            error={formError}
            onSubmit={(values) => edit.mutate(values)}
            onCancel={() => setPanel(null)}
          />
        </section>
      )}

      {current ? (
        <CurrentMembership current={current} dimmed={!m.is_active} />
      ) : (
        <Notice title="No membership yet.">
          {m.is_active ? 'Start a plan to begin their countdown.' : 'Activate the member, then start a plan.'}
        </Notice>
      )}

      <History subscriptions={rows} payments={payments.data!.rows} />

      {m.is_active && (
        <div className="mt-2 border-t border-rule pt-6 lg:mt-6">
          <ConfirmButton
            label="Deactivate member"
            question={`Deactivate ${m.full_name}? They can't renew or pay until you activate them again.`}
            confirm="Deactivate"
            pending={setActive.isPending}
            onConfirm={() => setActive.mutate(false)}
          />
        </div>
      )}
    </Page>
  )
}
