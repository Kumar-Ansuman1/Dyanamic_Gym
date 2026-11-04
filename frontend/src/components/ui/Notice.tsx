import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

type NoticeProps = {
  tone?: 'empty' | 'error'
  title: string
  children?: ReactNode
  action?: ReactNode
}

// Empty = dashed frame (nothing here yet). Error = LED frame, says what failed and how to recover.
export function Notice({ tone = 'empty', title, children, action }: NoticeProps) {
  const error = tone === 'error'
  return (
    <div
      role={error ? 'alert' : undefined}
      className={`flex flex-col items-start gap-3 px-5 py-6 ${error ? 'border border-led' : 'border border-dashed border-rule-strong'}`}
    >
      <p className={`flex items-center gap-2 font-semibold ${error ? 'text-led' : 'text-fg'}`}>
        {error && <TriangleAlert className="size-4 shrink-0" aria-hidden />}
        {title}
      </p>
      {children && <div className="max-w-prose text-fg-muted">{children}</div>}
      {action}
    </div>
  )
}
