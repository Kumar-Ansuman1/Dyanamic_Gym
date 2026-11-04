import { SegmentDisplay } from 'frontend'

export const Digits = () => (
  <div style={{ fontSize: 48 }}>
    <SegmentDisplay value="0123456789" label="Digits zero to nine" />
  </div>
)

export const Panel = () => (
  <div
    style={{
      display: 'inline-flex',
      flexDirection: 'column',
      gap: 12,
      padding: '20px 24px',
      background: 'var(--color-panel)',
      border: '1px solid var(--color-rule)',
    }}
  >
    <span className="label-panel" style={{ color: 'var(--color-fg-muted)' }}>
      Days left
    </span>
    <span style={{ fontSize: 96 }}>
      <SegmentDisplay value=" 3" label="3 days left" />
    </span>
  </div>
)

export const Unread = () => (
  <div style={{ fontSize: 20 }}>
    <SegmentDisplay value="12" label="12 unread reminders" />
  </div>
)
