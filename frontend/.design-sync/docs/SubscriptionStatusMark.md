---
category: Status
---
Status of a membership subscription, from the backend `status` field: active, pending, expired or cancelled.

- `pending` is shown as **Upcoming**: the start date is in the future. It does not mean unpaid. Show money owed separately.
- Active is full-strength text; the rest are muted.

```jsx
<div style={{ display: 'grid', gap: 10 }}>
  <SubscriptionStatusMark status="active" />
  <SubscriptionStatusMark status="pending" />
  <SubscriptionStatusMark status="expired" />
  <SubscriptionStatusMark status="cancelled" />
</div>
```
