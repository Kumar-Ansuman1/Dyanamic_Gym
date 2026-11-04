import type { UseQueryResult } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { errorMessage } from '../../lib/api-client.ts'
import { useDebounced } from '../../lib/use-debounced.ts'
import type { Page } from '../../types/api.ts'
import { Button } from '../ui/Button.tsx'
import { TextField } from '../ui/Field.tsx'

export const PAGE_SIZE = 20

/** Inside a list frame: loading rows, an error with Retry, the empty line, or the rows themselves. */
export function ListBody<T>({
  query,
  what,
  empty,
  children,
}: {
  query: UseQueryResult<Page<T>>
  /** "members", for "Couldn't load the members." */
  what: string
  empty: ReactNode
  children: (rows: T[]) => ReactNode
}) {
  if (query.isError) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
        <p className="flex items-start gap-2 text-sm text-led">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Couldn't load the {what}. {errorMessage(query.error)}
        </p>
        <Button size="sm" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    )
  }
  if (query.isPending) {
    return (
      <ul aria-busy aria-label={`Loading the ${what}`}>
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex flex-col gap-2 border-t border-rule px-4 py-3.5 first:border-t-0">
            <span className="block h-3 w-40 bg-raised" />
            <span className="block h-2.5 w-24 bg-raised" />
          </li>
        ))}
      </ul>
    )
  }
  if (query.data.rows.length === 0) return <div className="px-4 py-6 text-sm text-fg-muted">{empty}</div>
  return <div className={`transition-opacity duration-150 ${query.isPlaceholderData ? 'opacity-60' : ''}`}>{children(query.data.rows)}</div>
}

/** Filters and page live in the URL, so they survive paging, opening a row and coming back. */
export function useListParams() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)

  /** Set one filter. Changing a filter goes back to page 1. */
  const set = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        if (key !== 'page') next.delete('page')
        return next
      },
      { replace: true },
    )

  const setPage = (to: number) => {
    set('page', to > 1 ? String(to) : null)
    window.scrollTo({ top: 0 })
  }

  return { params, page, skip: (page - 1) * PAGE_SIZE, set, setPage }
}

/** Search box that waits for a pause in typing before it filters. */
export function ListSearch({
  label,
  placeholder,
  value,
  onSearch,
}: {
  label: string
  placeholder: string
  value: string
  onSearch: (term: string) => void
}) {
  const [text, setText] = useState(value)
  const term = useDebounced(text.trim(), 300)
  // Only a newly typed term searches; onSearch is a fresh closure every render.
  useEffect(() => {
    if (term !== value) onSearch(term)
  }, [term]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <TextField label={label} type="search" placeholder={placeholder} autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} />
  )
}

function pageList(page: number, pages: number) {
  const keep = new Set([1, pages, page - 1, page, page + 1])
  const out: (number | 'gap')[] = []
  for (let p = 1; p <= pages; p++) {
    if (keep.has(p)) out.push(p)
    else if (out.at(-1) !== 'gap') out.push('gap')
  }
  return out
}

export function Pager({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) {
  if (total === 0) return null
  const pages = Math.ceil(total / PAGE_SIZE)
  const from = (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)
  const cell = 'h-11 min-w-11 px-2 text-[0.8125rem] tabular-nums md:h-8 md:min-w-8'

  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[0.8125rem] text-fg-muted tabular-nums">
        {from}–{to} of {total}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <Button variant="quiet" size="sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          {pageList(page, pages).map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} aria-hidden className="px-1 text-fg-faint">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
                onClick={() => onPage(p)}
                className={`${cell} ${p === page ? 'bg-fg font-semibold text-ink' : 'text-fg-muted hover:bg-raised hover:text-fg'}`}
              >
                {p}
              </button>
            ),
          )}
          <Button variant="quiet" size="sm" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    </nav>
  )
}

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string }

/** A ruled table on desktop; the same rows stack into two-line entries on phones. */
export function DataTable<T>({
  label,
  rows,
  columns,
  rowKey,
  mobileRow,
  expanded,
}: {
  label: string
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  mobileRow: (row: T) => ReactNode
  /** Content opened under a row (a form), or null. */
  expanded?: (row: T) => ReactNode
}) {
  return (
    <>
      <table aria-label={label} className="hidden w-full border-collapse text-sm md:table">
        <thead>
          <tr className="text-left text-xs text-fg-faint">
            {columns.map((column, i) => (
              <th key={i} scope="col" className={`px-4 py-2.5 font-medium ${column.className ?? ''}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const open = expanded?.(row)
            return (
              <Fragment key={rowKey(row)}>
                <tr className={`border-t border-rule ${open ? 'bg-raised' : ''}`}>
                  {columns.map((column, i) => (
                    <td key={i} className={`px-4 py-3.5 ${column.className ?? ''}`}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
                {open && (
                  <tr className="bg-raised">
                    <td colSpan={columns.length}>{open}</td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      <ul aria-label={label} className="md:hidden">
        {rows.map((row) => {
          const open = expanded?.(row)
          return (
            <li key={rowKey(row)} className={`border-b border-rule last:border-b-0 ${open ? 'bg-raised' : ''}`}>
              {mobileRow(row)}
              {open}
            </li>
          )
        })}
      </ul>
    </>
  )
}

/** Phone row: bold primary line with a figure on the right, muted meta line with a status on the right. */
export function StackedRow({
  title,
  value,
  meta,
  status,
  to,
  children,
}: {
  title: ReactNode
  value?: ReactNode
  meta: ReactNode
  status?: ReactNode
  to?: string
  /** Row actions, under the two lines. */
  children?: ReactNode
}) {
  const lines = (
    <>
      <span className="flex justify-between gap-3 text-[0.9375rem]">
        <span className="min-w-0 truncate font-semibold group-hover:underline">{title}</span>
        {value !== undefined && <span className="shrink-0 tabular-nums">{value}</span>}
      </span>
      <span className="flex items-center justify-between gap-3 text-[0.8125rem] text-fg-muted">
        <span className="min-w-0 truncate tabular-nums">{meta}</span>
        {status}
      </span>
    </>
  )
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      {to ? (
        <Link to={to} className="group flex flex-col gap-1">
          {lines}
        </Link>
      ) : (
        <div className="flex flex-col gap-1">{lines}</div>
      )}
      {children && <div className="flex flex-wrap items-center gap-2 pt-1">{children}</div>}
    </div>
  )
}
