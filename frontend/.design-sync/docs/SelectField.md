---
category: Forms
---
Labelled native select with the same frame as TextField. Use it for choosing from a short list, like the membership plan. Children are `<option>` elements.

- Plan options read "Name · ₹price", e.g. "Quarterly · ₹3,000".
- Fewer than 5 short options that all fit on one line: use `Segmented` instead.

```jsx
<SelectField label="Plan" defaultValue="quarterly">
  <option value="monthly">Monthly · ₹1,200</option>
  <option value="quarterly">Quarterly · ₹3,000</option>
  <option value="half">Half-yearly · ₹5,500</option>
  <option value="annual">Annual · ₹10,000</option>
</SelectField>
```
