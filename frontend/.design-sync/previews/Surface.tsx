import { Button, Surface, Wordmark } from 'frontend'

export const ScreenRoot = () => (
  <Surface style={{ padding: 24, border: '1px solid var(--color-rule)' }}>
    <div style={{ fontSize: 20 }}>
      <Wordmark />
    </div>
    <h1 style={{ marginTop: 24, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Members</h1>
    <p style={{ marginTop: 4, color: 'var(--color-fg-muted)' }}>Search by name, phone or member code.</p>
    <div style={{ marginTop: 20 }}>
      <Button variant="primary">New member</Button>
    </div>
  </Surface>
)
