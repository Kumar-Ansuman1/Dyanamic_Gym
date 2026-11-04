import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ListBody, PAGE_SIZE, Pager, useListParams } from '../../components/layout/List.tsx'
import { Page } from '../../components/layout/Page.tsx'
import { BOARD, Outcome, Section } from '../../components/layout/Section.tsx'
import { Button, buttonClass } from '../../components/ui/Button.tsx'
import { Segmented } from '../../components/ui/Field.tsx'
import { Status, UrgencyTag } from '../../components/ui/Status.tsx'
import { api, errorMessage, getPage } from '../../lib/api-client.ts'
import { daysUntil, formatShortDate, toISODate } from '../../lib/formatters.ts'
import type { Notification } from '../../types/api.ts'

const SHOW = [
  { value: 'unread', label: 'Unread' },
  { value: 'all', label: 'All' },
] as const

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const { params, page, skip, set, setPage } = useListParams()
  // Unread first: that's what the bell sent the owner here for.
  const show = (params.get('show') ?? 'unread') as (typeof SHOW)[number]['value']

  const list = useQuery({
    queryKey: ['notifications', 'list', show, page],
    queryFn: () => getPage<Notification>('/notifications', { unread_only: show === 'unread', skip, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  const markRead = useMutation({
    mutationFn: (n: Notification) => api.patch<Notification>(`/notifications/${n.id}/read`).then((r) => r.data),
    // Refreshes the list and the bell's unread count together; both live under ['notifications'].
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <Page title="Notifications">
      <Segmented label="Show" name="notification-filter" options={SHOW} value={show} onChange={(v) => set('show', v === 'unread' ? null : v)} />

      <Outcome outcome={markRead.isError ? { tone: 'warn', text: `Couldn't mark it read: ${errorMessage(markRead.error)}` } : null} />

      <div className={BOARD}>
        <Section title={show === 'unread' ? 'Unread' : 'All reminders'} count={list.data?.total} first>
          <ListBody
            query={list}
            what="notifications"
            empty={
              show === 'unread'
                ? 'All caught up. Reminders arrive 7 days and 3 days before a membership ends, and on the day.'
                : 'No reminders yet. They arrive 7 days and 3 days before a membership ends, and on the day.'
            }
          >
            {(rows) => (
              <ul aria-label="Notifications">
                {rows.map((n) => {
                  const unread = n.read_at === null
                  const days = daysUntil(n.end_date)
                  return (
                    <li
                      key={n.id}
                      className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2.5 border-b border-rule px-4 py-3 last:border-b-0 md:grid-cols-[6rem_minmax(0,1fr)_9rem_auto] md:items-center md:gap-x-6"
                    >
                      {unread ? (
                        <Status form="solid" label="Unread" className="mt-0.5 text-fg md:mt-0" />
                      ) : (
                        <Status form="hollow" label="Read" className="mt-0.5 text-fg-muted md:mt-0" />
                      )}
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <p className={unread ? 'font-semibold' : 'text-fg-muted'}>{n.message}</p>
                        <p className="text-[0.8125rem] text-fg-muted tabular-nums">
                          {n.member_code} · Ends {formatShortDate(n.end_date)} · Sent {formatShortDate(toISODate(new Date(n.created_at)))}
                        </p>
                        <div className="md:hidden">
                          <UrgencyTag days={days} />
                        </div>
                      </div>
                      <div className="hidden md:block">
                        <UrgencyTag days={days} />
                      </div>
                      <div className="col-start-2 flex flex-wrap items-center gap-2 md:col-start-auto md:justify-end">
                        <Link to={`/members/${n.member_id}`} className={buttonClass('secondary', 'sm')}>
                          Open {n.member_name}
                        </Link>
                        {unread && (
                          <Button
                            size="sm"
                            variant="quiet"
                            aria-label={`Mark read: ${n.message}`}
                            loading={markRead.isPending && markRead.variables?.id === n.id}
                            onClick={() => markRead.mutate(n)}
                          >
                            Mark read
                          </Button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </ListBody>
        </Section>
      </div>

      <Pager page={page} total={list.data?.total ?? 0} onPage={setPage} />
    </Page>
  )
}
