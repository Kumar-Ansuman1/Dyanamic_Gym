---
category: Status
---
Status mark plus word. The mark's form carries meaning (solid, dashed, hollow, struck), so status never depends on colour alone.

- Prefer the specific wrappers: `SubscriptionStatusMark`, `PaymentStatusMark`, `MemberStatusMark`. Use `Status` directly only for a new status that follows the same form language.
- Form meanings: solid = live/done, dashed = not started yet, hollow = ended, struck = cancelled or reversed.

```jsx
<div style={{ display: 'grid', gap: 10 }}>
  <Status form="solid" label="Active" />
  <Status form="dashed" label="Upcoming" />
  <Status form="hollow" label="Expired" />
  <Status form="struck" label="Cancelled" />
</div>
```
