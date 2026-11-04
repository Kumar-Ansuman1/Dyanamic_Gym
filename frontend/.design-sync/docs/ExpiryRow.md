---
category: Board
---
One row of the expiry board (the Today screen's core): LED days left, member name and code, plan and end date, urgency tag, and a Renew button that opens a renew-and-collect form inside the row.

- Render rows inside a `<ul>`, grouped under faceplate headers: Ends today, Within 3 days, Within 7 days, Lapsed. Each header carries a count.
- Exactly one row is open at a time. Pass `dimmed` to every other row so the board steps back.
- The Renew button is red only within 3 days of expiry; otherwise it's outlined, so a full board isn't a wall of red.
- The open form holds plan (defaults to the current plan), amount (pre-filled with the plan price), Paid by and an optional reference, and one confirm that renews and records the payment. `pending` shows the confirm loading.
- Dates are ISO `YYYY-MM-DD`; prices are strings like "3000". Never show internal IDs.

```jsx
<ul style={{ border: '1px solid var(--color-rule)' }}>
  <ExpiryRow
    name="Priya Sharma" code="GYM-0142" planName="Quarterly" planId="quarterly"
    endDate="2026-10-30" daysLeft={0} open={false} onToggle={() => {}} onRenew={() => {}}
    plans={[{ id: 'monthly', name: 'Monthly', price: '1200' }, { id: 'quarterly', name: 'Quarterly', price: '3000' }]}
  />
</ul>
```
