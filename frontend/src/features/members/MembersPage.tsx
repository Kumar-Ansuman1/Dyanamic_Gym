import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { DataTable, ListBody, ListSearch, PAGE_SIZE, Pager, StackedRow, useListParams } from '../../components/layout/List.tsx'
import { Page } from '../../components/layout/Page.tsx'
import { BOARD, Section } from '../../components/layout/Section.tsx'
import { buttonClass } from '../../components/ui/Button.tsx'
import { Segmented } from '../../components/ui/Field.tsx'
import { MemberStatusMark } from '../../components/ui/Status.tsx'
import { getPage } from '../../lib/api-client.ts'
import { formatDate } from '../../lib/formatters.ts'
import type { Member } from '../../types/api.ts'

const STATUS = [
  { value: 'all', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
] as const

export function MembersPage() {
  const { params, page, skip, set, setPage } = useListParams()
  const search = params.get('q') ?? ''
  const active = (params.get('active') ?? 'all') as (typeof STATUS)[number]['value']

  const list = useQuery({
    queryKey: ['members', 'list', search, active, page],
    queryFn: () =>
      getPage<Member>('/members', {
        search: search || undefined,
        is_active: active === 'all' ? undefined : active,
        skip,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const title = { all: 'All members', true: 'Active', false: 'Inactive' }[active]

  return (
    <Page
      title="Members"
      actions={
        <Link to="/members/new" className={buttonClass('primary', 'md', 'w-full lg:w-auto')}>
          New member
        </Link>
      }
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
        <div className="md:w-96">
          <ListSearch label="Search" placeholder="Name, phone or GYM- code" value={search} onSearch={(term) => set('q', term)} />
        </div>
        <Segmented label="Status" name="member-status" options={STATUS} value={active} onChange={(v) => set('active', v === 'all' ? null : v)} />
      </div>

      <div className={BOARD}>
        <Section title={title} count={list.data?.total} first>
          <ListBody
            query={list}
            what="members"
            empty={
              search ? (
                <>No member matches “{search}”. Check the spelling, or search by phone or code.</>
              ) : (
                <>
                  No {active === 'false' ? 'inactive ' : active === 'true' ? 'active ' : ''}members yet.{' '}
                  <Link to="/members/new" className="text-fg underline">
                    Register a walk-in
                  </Link>
                </>
              )
            }
          >
            {(rows) => (
              <DataTable
                label={title}
                rows={rows}
                rowKey={(m) => m.id}
                columns={[
                  {
                    header: 'Name',
                    className: 'font-semibold',
                    cell: (m) => (
                      <Link to={`/members/${m.id}`} className="hover:underline">
                        {m.full_name}
                      </Link>
                    ),
                  },
                  { header: 'Code', className: 'w-[14%] tracking-[0.04em] text-fg-muted tabular-nums', cell: (m) => m.member_code },
                  { header: 'Phone', className: 'w-[18%] tabular-nums', cell: (m) => m.phone },
                  { header: 'Joined', className: 'w-[18%] text-fg-muted tabular-nums', cell: (m) => formatDate(m.joined_on) },
                  { header: 'Status', className: 'w-[14%]', cell: (m) => <MemberStatusMark active={m.is_active} /> },
                ]}
                mobileRow={(m) => (
                  <StackedRow
                    to={`/members/${m.id}`}
                    title={m.full_name}
                    value={<span className="text-[0.8125rem] tracking-[0.04em] text-fg-muted">{m.member_code}</span>}
                    meta={m.phone}
                    status={<MemberStatusMark active={m.is_active} />}
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
