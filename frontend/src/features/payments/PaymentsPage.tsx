import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { DataTable, ListBody, PAGE_SIZE, Pager, StackedRow, useListParams } from '../../components/layout/List.tsx'
import { Page } from '../../components/layout/Page.tsx'
import { BOARD, Section } from '../../components/layout/Section.tsx'
import { buttonClass } from '../../components/ui/Button.tsx'
import { Segmented } from '../../components/ui/Field.tsx'
import { PaymentStatusMark } from '../../components/ui/Status.tsx'
import { api, getPage } from '../../lib/api-client.ts'
import { formatDay, formatINR, methodLabel } from '../../lib/formatters.ts'
import type { Member, Payment, PaymentStatus } from '../../types/api.ts'
import { MemberPicker } from '../members/MemberPicker.tsx'

const STATUS = [
  { value: 'all', label: 'All' },
  { value: 'recorded', label: 'Received' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'reversed', label: 'Reversed' },
] as const

type StatusFilter = (typeof STATUS)[number]['value']

export function PaymentsPage() {
  const { params, page, skip, set, setPage } = useListParams()
  const status = (params.get('status') ?? 'all') as StatusFilter
  const memberId = params.get('member')

  const member = useQuery({
    queryKey: ['members', memberId],
    queryFn: () => api.get<Member>(`/members/${memberId}`).then((r) => r.data),
    enabled: !!memberId,
  })
  const list = useQuery({
    queryKey: ['payments', 'list', status, memberId, page],
    queryFn: () =>
      getPage<Payment>('/payments', {
        status: status === 'all' ? undefined : (status as PaymentStatus),
        member_id: memberId ?? undefined,
        skip,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const title = status === 'all' ? 'All payments' : STATUS.find((s) => s.value === status)!.label

  return (
    <Page
      title="Payments"
      actions={
        <Link to={memberId ? `/payments/new?member=${memberId}` : '/payments/new'} className={buttonClass('primary', 'md', 'w-full lg:w-auto')}>
          Record payment
        </Link>
      }
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="md:w-96">
          {memberId && member.isPending ? (
            <p className="text-sm text-fg-muted">Loading the member…</p>
          ) : (
            <MemberPicker label="Member" member={member.data ?? null} onChange={(m) => set('member', m?.id ?? null)} />
          )}
        </div>
        <Segmented label="Status" name="payment-status" options={STATUS} value={status} onChange={(v) => set('status', v === 'all' ? null : v)} />
      </div>

      <div className={BOARD}>
        <Section title={member.data ? `${title} · ${member.data.full_name}` : title} count={list.data?.total} first>
          <ListBody
            query={list}
            what="payments"
            empty={<>No {status === 'all' ? '' : `${title.toLowerCase()} `}payments{member.data ? ` from ${member.data.full_name}` : ''} yet.</>}
          >
            {(rows) => (
              <DataTable
                label="Payments"
                rows={rows}
                rowKey={(p) => p.id}
                columns={[
                  { header: 'Date', className: 'text-fg-muted tabular-nums', cell: (p) => formatDay(p.paid_at) },
                  {
                    header: 'Member',
                    cell: (p) => (
                      <Link to={`/members/${p.member_id}`} className="group flex flex-col">
                        <span className="font-semibold group-hover:underline">{p.member_name}</span>
                        <span className="text-[0.8125rem] tracking-[0.04em] text-fg-muted tabular-nums">{p.member_code}</span>
                      </Link>
                    ),
                  },
                  {
                    header: 'Amount',
                    className: 'text-right font-semibold tabular-nums',
                    cell: (p) => (
                      <Link to={`/payments/${p.id}`} className="hover:underline">
                        {formatINR(p.amount)}
                      </Link>
                    ),
                  },
                  { header: 'Method', className: 'pl-10!', cell: (p) => methodLabel(p.method) },
                  { header: 'Reference', className: 'text-fg-muted tabular-nums', cell: (p) => p.reference ?? '—' },
                  { header: 'Status', cell: (p) => <PaymentStatusMark status={p.status} /> },
                ]}
                mobileRow={(p) => (
                  <StackedRow
                    to={`/payments/${p.id}`}
                    title={p.member_name}
                    value={<span className="font-semibold">{formatINR(p.amount)}</span>}
                    meta={`${formatDay(p.paid_at)} · ${methodLabel(p.method)}`}
                    status={<PaymentStatusMark status={p.status} />}
                  />
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
