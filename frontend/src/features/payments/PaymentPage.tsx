import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Link, useParams } from 'react-router'
import { Page } from '../../components/layout/Page.tsx'
import { BOARD, Section } from '../../components/layout/Section.tsx'
import { Button, buttonClass } from '../../components/ui/Button.tsx'
import { Notice } from '../../components/ui/Notice.tsx'
import { PaymentStatusMark, SubscriptionStatusMark } from '../../components/ui/Status.tsx'
import { api, errorMessage, getPage } from '../../lib/api-client.ts'
import { formatDay, formatINR, formatPeriod, methodLabel } from '../../lib/formatters.ts'
import type { PaymentDetail, Subscription } from '../../types/api.ts'

const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' })

export function PaymentPage() {
  const { id = '' } = useParams()
  const payment = useQuery({ queryKey: ['payments', id], queryFn: () => api.get<PaymentDetail>(`/payments/${id}`).then((r) => r.data) })
  // Allocations carry only subscription ids; the member's subscriptions name them.
  const subscriptions = useQuery({
    queryKey: ['subscriptions', 'member', payment.data?.member_id],
    queryFn: () => getPage<Subscription>('/subscriptions', { member_id: payment.data!.member_id, limit: 100 }),
    enabled: !!payment.data,
  })

  const back = { to: '/payments', label: 'Payments' }
  const failed = payment.isError ? payment : subscriptions.isError ? subscriptions : null

  if (failed) {
    const missing = isAxiosError(payment.error) && payment.error.response?.status === 404
    return (
      <Page title={missing ? 'Payment not found' : 'Payment'} back={back}>
        {missing ? (
          <Notice
            title="That payment doesn't exist."
            action={
              <Link to="/payments" className={buttonClass('secondary', 'sm')}>
                All payments
              </Link>
            }
          >
            The link may be old. Find it in the payments list instead.
          </Notice>
        ) : (
          <Notice
            tone="error"
            title="Couldn't load this payment."
            action={
              <Button size="sm" onClick={() => failed.refetch()}>
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

  if (payment.isPending || subscriptions.isPending) {
    return (
      <Page title="Payment" back={back}>
        <div aria-busy className="-mx-4 h-48 border-y border-rule bg-panel lg:mx-0 lg:max-w-2xl lg:border" />
      </Page>
    )
  }

  const p = payment.data!
  const byId = new Map(subscriptions.data!.rows.map((s) => [s.id, s]))
  const applied = p.allocations.reduce((sum, a) => sum + Number(a.amount), 0)
  const unapplied = Number(p.amount) - applied

  return (
    <Page
      title={formatINR(p.amount)}
      back={back}
      meta={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.8125rem] text-fg-muted lg:text-sm">
          <Link to={`/members/${p.member_id}`} className="font-semibold text-fg hover:underline">
            {p.member_name}
          </Link>
          <span className="tabular-nums">{p.member_code}</span>
          <span className="text-fg">
            <PaymentStatusMark status={p.status} />
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-4 lg:max-w-2xl lg:gap-8">
        <div className={BOARD}>
          <Section title="Payment" first>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-2.5 px-4 py-4 text-sm [&_dd]:text-right [&_dd]:tabular-nums [&_dt]:text-fg-muted">
              <dt>Paid on</dt>
              <dd>
                {formatDay(p.paid_at)}, {time.format(new Date(p.paid_at))}
              </dd>
              <dt>Method</dt>
              <dd>{methodLabel(p.method)}</dd>
              <dt>Reference</dt>
              <dd className="break-words">{p.reference ?? '—'}</dd>
              {p.notes && (
                <>
                  <dt>Notes</dt>
                  <dd className="break-words">{p.notes}</dd>
                </>
              )}
            </dl>
          </Section>
        </div>

        <div className={BOARD}>
          <Section title="Applied to" count={p.allocations.length} first>
            <ul>
              {p.allocations.map((a) => {
                const s = byId.get(a.subscription_id)
                return (
                  <li key={a.id} className="flex items-center justify-between gap-4 border-b border-rule px-4 py-3 last:border-b-0">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-semibold">{s?.plan_name_snapshot ?? 'A membership'}</span>
                      {s && (
                        <span className="flex flex-wrap items-center gap-x-3 text-[0.8125rem] text-fg-muted tabular-nums">
                          {formatPeriod(s.start_date, s.end_date)}
                          <SubscriptionStatusMark status={s.status} />
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatINR(a.amount)}</span>
                  </li>
                )
              })}
              {unapplied > 0 && (
                <li className="flex items-center justify-between gap-4 px-4 py-3 text-fg-muted">
                  <span>Not applied to a membership</span>
                  <span className="shrink-0 tabular-nums">{formatINR(unapplied)}</span>
                </li>
              )}
            </ul>
          </Section>
        </div>
      </div>
    </Page>
  )
}
