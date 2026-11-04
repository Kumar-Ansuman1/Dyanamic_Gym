import { useQueryClient } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Page } from '../../components/layout/Page.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { session } from '../../lib/api-client.ts'

const LINKS = [
  { to: '/subscriptions', label: 'Subscriptions' },
  { to: '/plans', label: 'Plans' },
  { to: '/notifications', label: 'Notifications' },
]

/** Phone-only overflow for the bottom tab bar. */
export function MorePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return (
    <Page title="More">
      <ul className="-mx-4 divide-y divide-rule border-y border-rule">
        {LINKS.map(({ to, label }) => (
          <li key={to}>
            <Link to={to} className="flex min-h-12 items-center justify-between px-4 hover:bg-raised">
              {label}
              <ChevronRight className="size-4 text-fg-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <Button
        className="self-start"
        onClick={() => {
          session.clear()
          queryClient.clear()
          navigate('/login', { replace: true })
        }}
      >
        Sign out
      </Button>
    </Page>
  )
}
