import { SubscriptionStatusMark } from 'frontend'

export const AllStatuses = () => (
  <div style={{ display: 'grid', gap: 12 }}>
    <SubscriptionStatusMark status="active" />
    <SubscriptionStatusMark status="pending" />
    <SubscriptionStatusMark status="expired" />
    <SubscriptionStatusMark status="cancelled" />
  </div>
)
