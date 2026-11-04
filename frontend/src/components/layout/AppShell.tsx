import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { MemberSearch } from '../../features/members/MemberSearch.tsx'
import { api, session } from '../../lib/api-client.ts'
import type { UnreadCount } from '../../types/api.ts'
import { buttonClass } from '../ui/Button.tsx'
import { SegmentDisplay } from '../ui/Segment.tsx'
import { Wordmark } from '../ui/Wordmark.tsx'

const NAV = [
  { to: '/', label: 'Today' },
  { to: '/members', label: 'Members' },
  { to: '/subscriptions', label: 'Subscriptions' },
  { to: '/payments', label: 'Payments' },
  { to: '/plans', label: 'Plans' },
] as const

function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<UnreadCount>('/notifications/unread-count').then((r) => r.data.count),
    refetchInterval: 60_000,
  }).data
}

function BellLink({ count }: { count?: number }) {
  const label = count ? `Notifications, ${count} unread` : 'Notifications'
  return (
    <Link to="/notifications" aria-label={label} className={buttonClass('quiet', 'sm', 'gap-2 hover:no-underline')}>
      <Bell className="size-4" aria-hidden />
      {count ? <SegmentDisplay value={String(Math.min(count, 99))} label={`${count} unread`} className="text-[1.125rem]" /> : null}
    </Link>
  )
}

export function AppShell() {
  const unread = useUnreadCount()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const signOut = () => {
    session.clear()
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-rule bg-panel py-6 lg:flex">
        <Link to="/" aria-label="Dynamic Gym, go to Today" className="self-start px-6 text-[1.125rem]">
          <Wordmark />
        </Link>
        <nav aria-label="Main">
          <ul>
            {NAV.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `block border-l-2 px-[22px] py-2.5 text-sm leading-normal ${isActive ? 'border-led font-semibold text-fg' : 'border-transparent text-fg-muted hover:text-fg'}`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <button type="button" onClick={signOut} className="mt-auto self-start px-6 text-sm text-fg-muted hover:text-fg hover:underline">
          Sign out
        </button>
      </aside>

      <div className="flex min-w-0 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <header className="flex flex-col gap-4 border-b border-rule px-4 pt-4 pb-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6 lg:px-8 lg:py-4">
          <div className="flex items-center justify-between lg:hidden">
            <Link to="/" aria-label="Dynamic Gym, go to Today" className="text-base">
              <Wordmark />
            </Link>
            <BellLink count={unread} />
          </div>
          <div className="lg:w-[420px] lg:max-w-full">
            <MemberSearch />
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <Link to="/members/new" className={buttonClass('secondary')}>
              New member
            </Link>
            <BellLink count={unread} />
          </div>
        </header>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <TabBar />
    </div>
  )
}

function TabBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-14 items-center justify-center border-t-2 text-xs ${isActive ? 'border-led font-semibold text-fg' : 'border-transparent text-fg-muted'}`

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-rule bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <NavLink to="/" end className={tab}>
        Today
      </NavLink>
      <NavLink to="/members" className={tab}>
        Members
      </NavLink>
      <div className="relative flex items-center justify-center" onKeyDown={(e) => e.key === 'Escape' && setMenuOpen(false)}>
        <button
          type="button"
          aria-label="New member or payment"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex min-h-10 min-w-11 items-center justify-center border border-rule-strong text-fg"
        >
          <Plus className="size-5" aria-hidden />
        </button>
        {menuOpen && (
          <div className="absolute bottom-full left-1/2 mb-3 flex w-48 -translate-x-1/2 flex-col border border-rule-strong bg-panel">
            <Link to="/members/new" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-sm hover:bg-raised">
              New member
            </Link>
            <Link to="/payments/new" onClick={() => setMenuOpen(false)} className="border-t border-rule px-4 py-3 text-sm hover:bg-raised">
              Record payment
            </Link>
          </div>
        )}
      </div>
      <NavLink to="/payments" className={tab}>
        Payments
      </NavLink>
      <NavLink to="/more" className={tab}>
        More
      </NavLink>
    </nav>
  )
}
