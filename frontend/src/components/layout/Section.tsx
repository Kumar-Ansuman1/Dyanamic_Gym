import type { ReactNode } from 'react'

/** The panel-black header bar over every list: wide caps title, count on the right. */
export const HEADER_BAR = 'flex items-baseline justify-between gap-4 border-b border-rule bg-panel px-4 py-2.5 text-fg-muted'

/** Ruled frame for lists: full-bleed with top/bottom rules on phones, a boxed panel on desktop. */
export const BOARD = '-mx-4 border-y border-rule lg:mx-0 lg:border'

export function Section({
  title,
  count,
  first,
  children,
}: {
  title: string
  count?: ReactNode
  first?: boolean
  children: ReactNode
}) {
  return (
    <section aria-label={title}>
      <h2 className={`${HEADER_BAR} ${first ? '' : 'border-t'}`}>
        <span className="label-panel">{title}</span>
        {count !== undefined && <span className="text-[0.8125rem] tabular-nums">{count}</span>}
      </h2>
      {children}
    </section>
  )
}

export type OutcomeText = { tone: 'done' | 'warn'; text: string } | null

/** What the last action did, in one line. A live region, so screen readers hear it too. */
export function Outcome({ outcome }: { outcome: OutcomeText }) {
  return (
    <p role="status" className={outcome ? 'flex items-start gap-2.5 text-sm' : 'sr-only'}>
      {outcome && (
        <>
          <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 ${outcome.tone === 'done' ? 'bg-fg' : 'border border-led'}`} />
          <span className={outcome.tone === 'warn' ? 'text-led' : ''}>{outcome.text}</span>
        </>
      )}
    </p>
  )
}
