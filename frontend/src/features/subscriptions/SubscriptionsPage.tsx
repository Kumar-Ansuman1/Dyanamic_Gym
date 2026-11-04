import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { DataTable, ListBody, PAGE_SIZE, Pager, StackedRow, useListParams } from '../../components/layout/List.tsx'
import { Page } from '../../components/layout/Page.tsx'
import { BOARD, Outcome, Section, type OutcomeText } from '../../components/layout/Section.tsx'
import { Button, ConfirmButton } from '../../components/ui/Button.tsx'
import { RenewForm, type RenewInput } from '../../components/ui/ExpiryRow.tsx'
import { Segmented } from '../../components/ui/Field.tsx'
import { SubscriptionStatusMark } from '../../components/ui/Status.tsx'
import { api, errorMessage, getPage } from '../../lib/api-client.ts'
import { addDays, formatINR, formatPeriod, formatShortDate, toISODate } from '../../lib/formatters.ts'
import type { Member, Subscription, SubscriptionStatus } from '../../types/api.ts'
import { MemberPicker } from '../members/MemberPicker.tsx'
import { checkRenewInput, PaymentNotRecorded, renewAndCollect, renewedText, usePlanOptions } from './collect.ts'

const STATUS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Upcoming' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

type StatusFilter = (typeof STATUS)[number]['value']

function Due({ s }: { s: Subscription }) {
  return Number(s.balance_due) > 0 ? (
    <span className="font-semibold text-led">{formatINR(s.balance_due)} due</span>
  ) : (
    <span className="text-fg-muted">{s.status === 'cancelled' ? '—' : 'Paid'}</span>
  )
}

export function SubscriptionsPage() {
  const queryClient = useQueryClient()
  const { params, page, skip, set, setPage } = useListParams()
  const status = (params.get('status') ?? 'all') as StatusFilter
  const memberId = params.get('member')
  const [openId, setOpenId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<OutcomeText>(null)

  const member = useQuery({
    queryKey: ['members', memberId],
    queryFn: () => api.get<Member>(`/members/${memberId}`).then((r) => r.data),
    enabled: !!memberId,
  })
  const list = useQuery({
    queryKey: ['subscriptions', 'list', status, memberId, page],
    queryFn: () =>
      getPage<Subscription>('/subscriptions', {
        status: status === 'all' ? undefined : (status as SubscriptionStatus),
        member_id: memberId ?? undefined,
        skip,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })
  const plans = usePlanOptions()

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    queryClient.invalidateQueries({ queryKey: ['payments'] })
  }

  const renew = useMutation({
    mutationFn: renewAndCollect,
    onSuccess: (result) => {
      setOutcome({ tone: 'done', text: renewedText(result) })
      setOpenId(null)
    },
    onError: (error) => {
      if (error instanceof PaymentNotRecorded) {
        setOutcome({ tone: 'warn', text: error.message })
        setOpenId(null)
      } else {
        setRowError(errorMessage(error))
      }
    },
    onSettled: refresh,
  })

  const cancel = useMutation({
    mutationFn: (s: Subscription) => api.patch<Subscription>(`/subscriptions/${s.id}/cancel`).then((r) => r.data),
    onSuccess: (s) => setOutcome({ tone: 'done', text: `Cancelled ${s.member_name}'s ${s.plan_name_snapshot}. Nothing more is due on it.` }),
    onError: (error) => setOutcome({ tone: 'warn', text: `Couldn't cancel: ${errorMessage(error)}` }),
    onSettled: refresh,
  })

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id)
    setRowError(null)
  }

  const submitRenew = (s: Subscription, input: RenewInput) => {
    const problem = checkRenewInput(input, plans.data ?? [])
    setRowError(problem)
    if (!problem) renew.mutate({ subscription: s, input })
  }

  const actions = (s: Subscription) => (
    <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:justify-end">
      {s.status !== 'cancelled' && (
        <Button size="sm" aria-expanded={openId === s.id} disabled={!plans.data?.length} onClick={() => toggle(s.id)}>
          {openId === s.id ? 'Close' : 'Renew'}
        </Button>
      )}
      {(s.status === 'active' || s.status === 'pending') && (
        <ConfirmButton
          size="sm"
          variant="quiet"
          label="Cancel"
          question={`Cancel ${s.member_name}'s ${s.plan_name_snapshot}?`}
          confirm="Cancel plan"
          pending={cancel.isPending && cancel.variables?.id === s.id}
          onConfirm={() => cancel.mutate(s)}
        />
      )}
    </div>
  )

  const renewForm = (s: Subscription) => {
    if (openId !== s.id || !plans.data) return null
    const today = toISODate(new Date())
    const starts = addDays(s.end_date, 1) > today ? addDays(s.end_date, 1) : today
    return (
      <RenewForm
        name={s.member_name}
        plans={plans.data}
        planId={plans.data.some((p) => p.id === s.plan_id) ? s.plan_id : plans.data[0].id}
        note={`New period starts ${starts === today ? 'today' : formatShortDate(starts)}`}
        pending={renew.isPending}
        error={rowError}
        onSubmit={(input) => submitRenew(s, input)}
        onCancel={() => toggle(s.id)}
      />
    )
  }

  const title = STATUS.find((s) => s.value === status)!.label

  return (
    <Page title="Subscriptions">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="md:w-96">
          {memberId && member.isPending ? (
            <p className="text-sm text-fg-muted">Loading the member…</p>
          ) : (
            <MemberPicker label="Member" member={member.data ?? null} onChange={(m) => set('member', m?.id ?? null)} />
          )}
        </div>
        <Segmented label="Status" name="subscription-status" options={STATUS} value={status} onChange={(v) => set('status', v === 'all' ? null : v)} />
      </div>

      <Outcome outcome={outcome} />

      <div className={BOARD}>
        <Section title={member.data ? `${title} · ${member.data.full_name}` : title} count={list.data?.total} first>
          <ListBody
            query={list}
            what="subscriptions"
            empty={
              <>
                No {status === 'all' ? '' : `${title.toLowerCase()} `}subscriptions{member.data ? ` for ${member.data.full_name}` : ''}.
              </>
            }
          >
            {(rows) => (
              <DataTable
                label="Subscriptions"
                rows={rows}
                rowKey={(s) => s.id}
                expanded={renewForm}
                columns={[
                  {
                    header: 'Member',
                    cell: (s) => (
                      <Link to={`/members/${s.member_id}`} className="group flex flex-col">
                        <span className="font-semibold group-hover:underline">{s.member_name}</span>
                        <span className="text-[0.8125rem] tracking-[0.04em] text-fg-muted tabular-nums">{s.member_code}</span>
                      </Link>
                    ),
                  },
                  { header: 'Plan', cell: (s) => s.plan_name_snapshot },
                  { header: 'Period', className: 'text-fg-muted tabular-nums', cell: (s) => formatPeriod(s.start_date, s.end_date) },
                  { header: 'Price', className: 'text-right tabular-nums', cell: (s) => formatINR(s.price) },
                  { header: 'Balance', className: 'tabular-nums', cell: (s) => <Due s={s} /> },
                  { header: 'Status', cell: (s) => <SubscriptionStatusMark status={s.status} /> },
                  { header: '', className: 'w-[1%] whitespace-nowrap', cell: actions },
                ]}
                mobileRow={(s) => (
                  <StackedRow
                    title={s.member_name}
                    value={<Due s={s} />}
                    meta={`${s.member_code} · ${s.plan_name_snapshot} · ${formatPeriod(s.start_date, s.end_date)}`}
                    status={<SubscriptionStatusMark status={s.status} />}
                  >
                    {actions(s)}
                  </StackedRow>
                )}
              />
            )}
          </ListBody>
        </Section>
      </div>

      <Pager page={page} total={list.data?.total ?? 0} onPage={setPage} />
    </Page>
  )
}
