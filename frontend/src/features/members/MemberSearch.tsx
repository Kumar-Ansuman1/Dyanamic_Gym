import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { TextField } from '../../components/ui/Field.tsx'
import { api, errorMessage } from '../../lib/api-client.ts'
import { useDebounced } from '../../lib/use-debounced.ts'
import type { Member } from '../../types/api.ts'

/** Name, phone or member code; the few best matches. */
export function useMemberSearch(text: string, limit = 6) {
  const term = useDebounced(text.trim(), 250)
  const results = useQuery({
    queryKey: ['members', 'search', term, limit],
    queryFn: () => api.get<Member[]>('/members', { params: { search: term, limit } }).then((r) => r.data),
    enabled: term.length > 0,
  })
  return { term, results }
}

/** Header search: name, phone or member code; results drop down as links to the member page. */
export function MemberSearch() {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const { term, results } = useMemberSearch(text)
  const resultsId = useId()

  const showResults = open && term.length > 0
  const close = () => {
    setOpen(false)
    setText('')
  }

  return (
    <div
      className="relative"
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
    >
      <TextField
        label="Find a member"
        type="search"
        placeholder="Name, phone or GYM- code"
        autoComplete="off"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        aria-controls={resultsId}
        aria-expanded={showResults}
      />
      {showResults && (
        <div id={resultsId} className="absolute inset-x-0 top-full z-30 mt-1 border border-rule-strong bg-panel">
          {results.isPending ? (
            <p className="px-3 py-2.5 text-sm text-fg-muted">Searching…</p>
          ) : results.isError ? (
            <p className="px-3 py-2.5 text-sm text-led">{errorMessage(results.error)}</p>
          ) : results.data.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-fg-muted">No member matches “{term}”.</p>
          ) : (
            <ul>
              {results.data.map((member) => (
                <li key={member.id} className="border-t border-rule first:border-t-0">
                  <Link
                    to={`/members/${member.id}`}
                    onClick={close}
                    className="flex items-baseline justify-between gap-3 px-3 py-2.5 hover:bg-raised focus-visible:bg-raised"
                  >
                    <span className="truncate font-semibold">{member.full_name}</span>
                    <span className="shrink-0 text-[0.8125rem] tracking-[0.04em] text-fg-muted tabular-nums">
                      {member.member_code} · {member.phone}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
