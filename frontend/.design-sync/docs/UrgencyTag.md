---
category: Status
---
Text tag for how soon a membership ends, on the one urgency ramp used on every screen (matching the backend's 7, 3 and 0 day reminders).

- More than 7 days: muted ("Ends in 24 days").
- 4–7 days: full text ("Ends in 6 days").
- 1–3 days: red ("Ends tomorrow", "Ends in 2 days").
- 0 days: lit red block ("Ends today").
- Negative: muted ("Lapsed 4 days ago"). Lapsed members belong in their own list.
- Pair it with `DaysLeft` in rows. Never restyle the ramp per screen.

```jsx
<div style={{ display: 'grid', gap: 8 }}>
  <UrgencyTag days={6} />
  <UrgencyTag days={2} />
  <UrgencyTag days={0} />
  <UrgencyTag days={-4} />
</div>
```
