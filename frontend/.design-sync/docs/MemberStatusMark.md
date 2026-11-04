---
category: Status
---
Whether a member is active (solid mark) or inactive (hollow mark), from the backend `is_active` field. Inactive members can't get new subscriptions.

```jsx
<div style={{ display: 'flex', gap: 24 }}>
  <MemberStatusMark active />
  <MemberStatusMark active={false} />
</div>
```
