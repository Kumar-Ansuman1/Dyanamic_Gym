import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { buttonClass } from '../ui/Button.tsx'
import { Notice } from '../ui/Notice.tsx'

type PageProps = {
  title: string
  /** Muted text beside the title, e.g. today's date. */
  aside?: ReactNode
  /** "← Members" above the title. */
  back?: { to: string; label: string }
  /** Lines under the title: code, phone, status. */
  meta?: ReactNode
  /** Header buttons, right of the title on desktop and full width under it on phones. */
  actions?: ReactNode
  children: ReactNode
}

/** Standard page body: back link, title with its aside and meta, header actions, content. */
export function Page({ title, aside, back, meta, actions, children }: PageProps) {
  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-8 lg:gap-8 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="flex min-w-0 flex-col gap-2 lg:gap-2.5">
          {back && (
            <Link
              to={back.to}
              className="-mt-1.5 flex min-h-8 w-fit items-center text-[0.8125rem] text-fg-muted hover:text-fg lg:mt-0 lg:mb-2 lg:min-h-0"
            >
              ← {back.label}
            </Link>
          )}
          <div className="flex items-baseline gap-2.5 lg:gap-3.5">
            <h1 className="text-[1.625rem] font-bold tracking-[-0.02em] lg:text-[1.75rem]">{title}</h1>
            {aside && <span className="text-sm text-fg-muted lg:text-[0.9375rem]">{aside}</span>}
          </div>
          {meta}
        </div>
        {actions && <div className={back ? 'lg:mt-8' : ''}>{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function NotFound() {
  return (
    <Page title="Not found">
      <Notice title="That page doesn't exist." action={<Link to="/" className={buttonClass('secondary', 'sm')}>Go to Today</Link>}>
        Check the address, or start again from Today.
      </Notice>
    </Page>
  )
}
