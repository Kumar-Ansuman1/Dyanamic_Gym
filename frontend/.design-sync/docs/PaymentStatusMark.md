---
category: Status
---
Status of a recorded payment, from the backend `status` field: recorded, refunded or reversed. `recorded` reads as **Received**.

```jsx
<div style={{ display: 'grid', gap: 10 }}>
  <PaymentStatusMark status="recorded" />
  <PaymentStatusMark status="refunded" />
  <PaymentStatusMark status="reversed" />
</div>
```
