---
category: Forms
---
Labelled text input on the black LED panel: label above, hint or error below. Use it for every typed value: names, phone, email, dates, amounts.

- Always pass `label`. Optional fields say so in the label ("Email (optional)").
- `error` replaces the hint, turns the frame red and is announced by screen readers. Name the problem and the way out ("This number already belongs to GYM-0142 Priya Sharma. Open that profile instead.").
- Money: `prefix="₹"` with `inputMode="decimal"`. Phone: `inputMode="tel"`. Dates: `type="date"`.
- Text is 16px on phones (so iOS never zooms) and 15px on desktop. Numbers are tabular.

```jsx
<div style={{ display: 'grid', gap: 20, maxWidth: 420 }}>
  <TextField label="Full name" defaultValue="Sneha Iyer" />
  <TextField label="Amount received" prefix="₹" inputMode="decimal" defaultValue="3000" hint="Leave the full price unless they pay part now." />
</div>
```
