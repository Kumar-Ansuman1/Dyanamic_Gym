import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { Page } from '../../components/layout/Page.tsx'
import { BOARD, HEADER_BAR, Outcome, Section, type OutcomeText } from '../../components/layout/Section.tsx'
import { Button, buttonClass } from '../../components/ui/Button.tsx'
import { ExpiryRow, type RenewInput, type RenewPlan } from '../../components/ui/ExpiryRow.tsx'
import { Notice } from '../../components/ui/Notice.tsx'
import { DaysLeft, SegmentDisplay } from '../../components/ui/Segment.tsx'
import { api, errorMessage } from '../../lib/api-client.ts'
import { addDays, daysUntil, formatINR, formatLongDay, toISODate } from '../../lib/formatters.ts'
import type { Subscription, SubscriptionQuery } from '../../types/api.ts'
import { checkRenewInput, PaymentNotRecorded, renewAndCollect, renewedText, usePlanOptions } from '../subscriptions/collect.ts'

const listSubscriptions = (params: SubscriptionQuery) =>
  api.get<Subscription[]>('/subscriptions', { params: { limit: 100, ...params } }).then((r) => r.data)

function BoardSkeleton() {
  return (
    <div aria-busy className={BOARD}>
      <p className={HEADER_BAR}>
        <span className="label-panel">Loading the board</span>
      </p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-rule px-4 py-3 last:border-b-0">
          <SegmentDisplay value="  " label="" className="text-[2rem]" />
          <div className="flex flex-col gap-2">
            <span className="block h-3 w-36 bg-raised" />
            <span className="block h-2.5 w-20 bg-raised" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TodayPage() {
  const queryClient = useQueryClient()
  const today = toISODate(new Date())
  const [openId, setOpenId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<OutcomeText>(null)

  const expiring = useQuery({
    queryKey: ['subscriptions', 'expiring', today],
    queryFn: () =>
      listSubscriptions({ status: 'active', ends_from: today, ends_to: addDays(today, 7), not_renewed: true, sort: 'ending' }),
  })
  const lapsed = useQuery({
    queryKey: ['subscriptions', 'lapsed', today],
    queryFn: () =>
      listSubscriptions({
        status: 'expired',
        ends_from: addDays(today, -14),
        ends_to: addDays(today, -1),
        not_renewed: true,
        sort: 'ending',
      }).then((rows) => rows.reverse()),
  })
  const owing = useQuery({ queryKey: ['subscriptions', 'balance'], queryFn: () => listSubscriptions({ has_balance: true }) })
  const plans = usePlanOptions()

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
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
  })

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id)
    setRowError(null)
  }

  const openFromHero = (id: string) => {
    setOpenId(id)
    setRowError(null)
    requestAnimationFrame(() => document.getElementById(`row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const submitRenew = (subscription: Subscription, input: RenewInput, plans: RenewPlan[]) => {
    const problem = checkRenewInput(input, plans)
    setRowError(problem)
    if (!problem) renew.mutate({ subscription, input })
  }

  const queries = [expiring, lapsed, owing, plans]

  if (queries.some((q) => q.isError)) {
    const failed = queries.find((q) => q.isError)
    return (
      <Page title="Today" aside={formatLongDay(new Date())}>
        <Notice
          tone="error"
          title="Couldn't load today's memberships."
          action={
            <Button size="sm" onClick={() => queries.forEach((q) => q.isError && q.refetch())}>
              Retry
            </Button>
          }
        >
          {errorMessage(failed?.error)}
        </Notice>
      </Page>
    )
  }

  if (queries.some((q) => q.isPending)) {
    return (
      <Page title="Today" aside={formatLongDay(new Date())}>
        <BoardSkeleton />
      </Page>
    )
  }

  const planOptions = plans.data!
  const rows = expiring.data!
  const dayOf = (s: Subscription) => daysUntil(s.end_date)
  const groups = [
    { title: 'Ends today', rows: rows.filter((s) => dayOf(s) <= 0) },
    { title: 'Within 3 days', rows: rows.filter((s) => dayOf(s) >= 1 && dayOf(s) <= 3) },
    { title: 'Within 7 days', rows: rows.filter((s) => dayOf(s) >= 4) },
    { title: 'Lapsed, last 14 days', rows: lapsed.data! },
  ].filter((group) => group.rows.length > 0)
  const hero = rows.slice(0, 3)
  const balances = owing.data!
  const stepBack = openId ? 'opacity-40' : ''

  return (
    <Page title="Today" aside={formatLongDay(new Date())}>
      <Outcome outcome={outcome} />

      {groups.length === 0 && balances.length === 0 ? (
        <Notice title="No one expires this week.">
          Members whose plan ends in the next 7 days show up here, with a Renew button on each.
        </Notice>
      ) : (
        <>
          {hero.length > 0 && (
            <ul
              aria-label="Nearest expiries"
              className={`-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 transition-opacity duration-300 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 ${stepBack}`}
            >
              {hero.map((s) => {
                const days = dayOf(s)
                return (
                  <li
                    key={s.id}
                    className="flex w-[272px] flex-none snap-start flex-col gap-3 border border-rule bg-panel px-[18px] pt-4 pb-[18px] md:w-auto md:gap-4 md:px-6 md:pt-5 md:pb-6"
                  >
                    <span className="label-panel text-fg-muted">Days left</span>
                    <DaysLeft days={days} className="text-[5rem] md:text-[6rem]" />
                    <div className="flex items-end justify-between gap-3 border-t border-rule pt-3 md:gap-4 md:pt-4">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="truncate text-base font-semibold md:text-lg">{s.member_name}</span>
                        <span className="truncate text-xs text-fg-muted tabular-nums md:text-[0.8125rem]">
                          {s.member_code} · {s.plan_name_snapshot}
                        </span>
                      </div>
                      <Button variant={days <= 3 ? 'primary' : 'secondary'} onClick={() => openFromHero(s.id)}>
                        Renew
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {groups.length > 0 && (
            <div className={BOARD}>
              {groups.map((group, i) => (
                <Section key={group.title} title={group.title} count={group.rows.length} first={i === 0}>
                  <ul>
                  {group.rows.map((s) => (
                    <ExpiryRow
                      key={s.id}
                      id={`row-${s.id}`}
                      name={s.member_name}
                      code={s.member_code}
                      planName={s.plan_name_snapshot}
                      planId={planOptions.some((p) => p.id === s.plan_id) ? s.plan_id : (planOptions[0]?.id ?? s.plan_id)}
                      endDate={s.end_date}
                      daysLeft={dayOf(s)}
                      plans={planOptions}
                      open={openId === s.id}
                      dimmed={openId !== null && openId !== s.id}
                      pending={renew.isPending && openId === s.id}
                      error={openId === s.id ? rowError : null}
                      onToggle={() => toggle(s.id)}
                      onRenew={(input) => submitRenew(s, input, planOptions)}
                    />
                  ))}
                  </ul>
                </Section>
              ))}
            </div>
          )}

          {balances.length > 0 && (
            <div className={`${BOARD} transition-opacity duration-300 ${stepBack}`}>
              <Section title="Balance due" count={balances.length} first>
                <ul>
                {balances.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5 last:border-b-0">
                    <span className="text-[0.8125rem] text-fg-muted tabular-nums lg:text-sm">
                      {s.member_name} · {s.member_code} · {formatINR(s.balance_due)} due on {s.plan_name_snapshot}
                    </span>
                    <Link to={`/payments/new?subscription=${s.id}`} className={buttonClass('secondary', 'sm')}>
                      Collect
                    </Link>
                  </li>
                ))}
                </ul>
              </Section>
            </div>
          )}
        </>
      )}
    </Page>
  )
}
