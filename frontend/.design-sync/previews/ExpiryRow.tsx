import { ExpiryRow } from 'frontend'
import { useState } from 'react'

const PLANS = [
  { id: 'monthly', name: 'Monthly', price: '1200' },
  { id: 'quarterly', name: 'Quarterly', price: '3000' },
  { id: 'half', name: 'Half-yearly', price: '5500' },
  { id: 'annual', name: 'Annual', price: '10000' },
]

const isoIn = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const GROUPS = [
  { title: 'Ends today', rows: [{ id: 'a', name: 'Priya Sharma', code: 'GYM-0142', plan: 'quarterly', days: 0 }] },
  {
    title: 'Within 3 days',
    rows: [
      { id: 'b', name: 'Arjun Mehta', code: 'GYM-0087', plan: 'monthly', days: 1 },
      { id: 'c', name: 'Sneha Iyer', code: 'GYM-0231', plan: 'annual', days: 3 },
    ],
  },
  { title: 'Within 7 days', rows: [{ id: 'd', name: 'Mohammed Faiz', code: 'GYM-0019', plan: 'half', days: 6 }] },
  { title: 'Lapsed', rows: [{ id: 'e', name: 'Rohit Verma', code: 'GYM-0056', plan: 'monthly', days: -4 }] },
]

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  padding: '10px 16px',
  background: 'var(--color-panel)',
  borderBottom: '1px solid var(--color-rule)',
  color: 'var(--color-fg-muted)',
} as const

function BoardDemo({ initialOpen = null }: { initialOpen?: string | null }) {
  const [openId, setOpenId] = useState<string | null>(initialOpen)
  return (
    <div style={{ border: '1px solid var(--color-rule)', background: 'var(--color-ink)' }}>
      {GROUPS.map((group) => (
        <div key={group.title}>
          <h3 style={header}>
            <span className="label-panel">{group.title}</span>
            <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{group.rows.length}</span>
          </h3>
          <ul>
            {group.rows.map((row) => {
              const plan = PLANS.find((p) => p.id === row.plan)!
              return (
                <ExpiryRow
                  key={row.id}
                  name={row.name}
                  code={row.code}
                  planName={plan.name}
                  planId={plan.id}
                  endDate={isoIn(row.days)}
                  daysLeft={row.days}
                  plans={PLANS}
                  open={openId === row.id}
                  dimmed={openId !== null && openId !== row.id}
                  onToggle={() => setOpenId(openId === row.id ? null : row.id)}
                  onRenew={() => setOpenId(null)}
                />
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

export const Board = () => <BoardDemo />

export const RenewOpen = () => <BoardDemo initialOpen="a" />
