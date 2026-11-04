---
category: Countdown
---
Two-cell LED countdown of days left on a membership. Single digits keep a blank unlit leading cell; lapsed shows "--"; anything above 99 shows 99. Screen readers hear "3 days left", "Ends today" or "Lapsed".

- Put it at the start of every expiry row, and use it large for the few nearest expiries on Today.
- Size with `className` (`text-[2rem]` in rows, `text-[7rem]` as a hero) or a wrapping font-size.

```jsx
<div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', fontSize: 40 }}>
  <DaysLeft days={12} />
  <DaysLeft days={3} />
  <DaysLeft days={0} />
  <DaysLeft days={-4} />
</div>
```
