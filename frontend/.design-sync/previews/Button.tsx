import { Button } from 'frontend'

const row = { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' } as const

export const Variants = () => (
  <div style={row}>
    <Button variant="primary">Renew</Button>
    <Button variant="secondary">Edit member</Button>
    <Button variant="danger">Cancel membership</Button>
    <Button variant="quiet">Not now</Button>
  </div>
)

export const States = () => (
  <div style={row}>
    <Button variant="primary" loading>
      Recording payment
    </Button>
    <Button variant="primary" disabled>
      Renew
    </Button>
    <Button disabled>Edit member</Button>
  </div>
)

export const Sizes = () => (
  <div style={row}>
    <Button variant="primary">Record payment</Button>
    <Button variant="primary" size="sm">
      Renew
    </Button>
    <Button size="sm">Retry</Button>
  </div>
)
