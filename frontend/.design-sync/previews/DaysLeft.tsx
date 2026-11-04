import { DaysLeft } from 'frontend'

const caption = { fontSize: 13, color: 'var(--color-fg-muted)' } as const

export const Ramp = () => (
  <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end' }}>
    {[
      [24, 'More than a week'],
      [6, 'This week'],
      [2, 'Within 3 days'],
      [0, 'Today'],
      [-4, 'Lapsed'],
    ].map(([days, text]) => (
      <div key={days} style={{ display: 'grid', gap: 8 }}>
        <span style={{ fontSize: 40 }}>
          <DaysLeft days={Number(days)} />
        </span>
        <span style={caption}>{text}</span>
      </div>
    ))}
  </div>
)

export const Hero = () => (
  <div style={{ fontSize: 112 }}>
    <DaysLeft days={1} />
  </div>
)
