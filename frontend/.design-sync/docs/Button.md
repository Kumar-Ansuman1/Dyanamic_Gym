---
category: Actions
---
Square-cornered action button. Red fill (`primary`) is reserved for the one act-now action on screen: Renew, Record payment, Register.

- `primary`: LED red with ink text. One per view or per row group, and only where the urgency ramp says act now.
- `secondary`: 1px outline. Default for everything else (Edit, Close, Retry).
- `danger`: red outline and red text. Destructive actions (Cancel membership, Deactivate). Always behind a confirmation step, never red-filled.
- `quiet`: text-only, for dismissals like "Not now".
- `loading` shows a spinner and disables the button. Keep the label a present-tense verb ("Recording payment").
- Heights: `md` is 44px on phones and 40px on desktop; `sm` is 36/32px.

```jsx
<div style={{ display: 'flex', gap: 12 }}>
  <Button variant="primary">Renew</Button>
  <Button>Edit member</Button>
  <Button variant="danger">Cancel membership</Button>
  <Button variant="quiet">Not now</Button>
</div>
```
