import { PaymentStatusMark } from 'frontend'

export const AllStatuses = () => (
  <div style={{ display: 'grid', gap: 12 }}>
    <PaymentStatusMark status="recorded" />
    <PaymentStatusMark status="refunded" />
    <PaymentStatusMark status="reversed" />
  </div>
)
