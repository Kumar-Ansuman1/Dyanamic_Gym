import { UrgencyTag } from 'frontend'

export const Ramp = () => (
  <div style={{ display: 'grid', gap: 10 }}>
    <UrgencyTag days={24} />
    <UrgencyTag days={6} />
    <UrgencyTag days={2} />
    <UrgencyTag days={1} />
    <UrgencyTag days={0} />
    <UrgencyTag days={-4} />
  </div>
)
