import { useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { TextField } from '../../components/ui/Field.tsx'
import { errorMessage } from '../../lib/api-client.ts'
import type { Member } from '../../types/api.ts'
import { useMemberSearch } from './MemberSearch.tsx'

/** Search, pick one member, then show them on one line with a quiet Change. */
export function MemberPicker({
  label = 'Member',
  member,
  onChange,
}: {
  label?: string
  member: Member | null
  onChange: (member: Member | null) => void
}) {
  const [text, setText] = useState('')
  const [picked, setPicked] = useState(false)
  const { term, results } = useMemberSearch(text)

  if (member) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[0.8125rem] font-medium text-fg-muted">{label}</span>
        <div className="flex items-center justify-between gap-3 border border-rule py-1 pr-1 pl-3.5 md:py-1.5 md:pr-1.5 md:pl-4">
          <div className="flex min-w-0 flex-col md:flex-row md:flex-wrap md:items-baseline md:gap-x-4">
            <span className="truncate font-semibold">{member.full_name}</span>
            <span className="text-[0.8125rem] text-fg-muted tabular-nums md:text-sm">
              {member.member_code}
              <span className="md:hidden"> · {member.phone}</span>
            </span>
            <span className="hidden text-sm text-fg-muted tabular-nums md:inline">{member.phone}</span>
          </div>
          <Button
            variant="quiet"
            size="sm"
            aria-label={`Change member, ${member.full_name} chosen`}
            autoFocus={picked}
            onClick={() => {
              setText('')
              onChange(null)
            }}
          >
            Change
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <TextField
        label={label}
        type="search"
        placeholder="Name, phone or GYM- code"
        autoComplete="off"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {term &&
        (results.isPending ? (
          <p className="mt-2 text-[0.8125rem] text-fg-muted">Searching…</p>
        ) : results.isError ? (
          <p className="mt-2 text-[0.8125rem] text-led">{errorMessage(results.error)}</p>
        ) : results.data.length === 0 ? (
          <p className="mt-2 text-[0.8125rem] text-fg-muted">No member matches “{term}”.</p>
        ) : (
          <ul aria-label="Matching members" className="mt-2 border border-rule">
            {results.data.map((m) => (
              <li key={m.id} className="border-t border-rule first:border-t-0">
                <button
                  type="button"
                  onClick={() => {
                    setPicked(true)
                    onChange(m)
                  }}
                  className="flex min-h-14 w-full flex-col justify-center gap-0.5 px-3.5 py-2.5 text-left hover:bg-raised md:grid md:min-h-0 md:grid-cols-[minmax(0,1fr)_auto_7rem] md:items-center md:gap-5 md:px-4 md:py-3"
                >
                  <span className="truncate font-semibold">{m.full_name}</span>
                  <span className="text-[0.8125rem] text-fg-muted tabular-nums md:text-sm">
                    {m.member_code}
                    <span className="md:hidden"> · {m.phone}</span>
                  </span>
                  <span className="hidden text-right text-sm text-fg-muted tabular-nums md:inline">{m.phone}</span>
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  )
}
