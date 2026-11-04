---
category: Forms
---
Radio group drawn as a row of switch positions; the chosen one lights up off-white. Use it for 2–5 short exclusive options: plan duration (1/3/6/12 months), payment method (Cash/UPI/Card/Bank/Other).

- Controlled: pass `value` and `onChange`. `name` must be unique per form.
- Wraps onto a second line on narrow screens. Keep labels to one or two words.

```jsx
<Segmented
  label="Paid by"
  name="method"
  value="upi"
  onChange={() => {}}
  options={[
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
  ]}
/>
```
