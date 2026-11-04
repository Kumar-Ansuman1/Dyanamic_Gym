# Dynamic Gym owner app: how to build with this library

Admin tool for one gym owner in India (prices in INR). The visual world is the red 7-segment interval timer on a gym wall: panel-black ground, LED red, 1px rules, square corners.

## Setup: wrap everything in Surface

Every component is drawn for the panel-black ground. On white, the off-white text and outlines disappear. Put exactly one `Surface` at the root of every design.

```jsx
const { Surface, Wordmark, Button, ExpiryRow, Notice, DaysLeft, UrgencyTag } = window.DynamicGymUI

<Surface style={{ minHeight: '100vh', padding: 24 }}>…</Surface>
```

## Styling idiom: CSS variables in inline styles

Only the classes the library itself uses are compiled, so don't invent Tailwind classes. Lay out your own glue with inline `style` and these variables:

| Variable | Use |
|---|---|
| `--color-ink` | page ground |
| `--color-panel` | inset panels, inputs, section header bars |
| `--color-raised` | open row, hover |
| `--color-rule` / `--color-rule-strong` | 1px dividers / control borders |
| `--color-fg` / `--color-fg-muted` / `--color-fg-faint` | primary / secondary / hint text |
| `--color-led` | act-now red: primary actions, urgency, lit digits |
| `--color-led-ghost` | unlit segment red |
| `--font-sans` | Archivo (the only family) |

Two utility classes are safe to use: `label-panel` (small wide caps, for section headers like "WITHIN 3 DAYS") and `tabular-nums` (for figures in columns).

## Rules the design must keep

- Square corners everywhere (no border-radius), 1px rules, no shadows, glows or gradients.
- Red means act now. Use a red-filled `Button variant="primary"` once per view or row group. Destructive actions use `variant="danger"` behind a confirmation.
- `DaysLeft` / `SegmentDisplay` only for countdowns and counts, never for names or money.
- Status always goes through `SubscriptionStatusMark`, `PaymentStatusMark`, `MemberStatusMark` or `UrgencyTag`. A subscription's `pending` status reads "Upcoming": it starts later, it isn't unpaid.
- Money: ₹ with Indian grouping (₹1,25,000). Dates: "Sat, 1 Nov". Show member codes (GYM-0142) beside names; never show internal IDs.
- No KPI cards, charts or trends: the backend has no analytics. Show real lists, like the expiry board.
- Lists group under `label-panel` headers on `--color-panel` bars, with a count on the right.

## Where the truth lives

`styles.css` imports `_ds_bundle.css`, which holds the tokens and component styles. Each component's API and usage are in `components/<group>/<Name>/<Name>.d.ts` and `<Name>.prompt.md`. Read those before composing.

## Example: Today's expiry board

```jsx
<Surface style={{ minHeight: '100vh', padding: 24 }}>
  <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Today</h1>
  <div style={{ marginTop: 24, border: '1px solid var(--color-rule)' }}>
    <h2 style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--color-panel)', borderBottom: '1px solid var(--color-rule)', color: 'var(--color-fg-muted)' }}>
      <span className="label-panel">Ends today</span><span className="tabular-nums">1</span>
    </h2>
    <ul>
      <ExpiryRow name="Priya Sharma" code="GYM-0142" planName="Quarterly" planId="q" endDate="2026-10-30"
        daysLeft={0} plans={[{ id: 'q', name: 'Quarterly', price: '3000' }]} open={false}
        onToggle={() => {}} onRenew={() => {}} />
    </ul>
  </div>
</Surface>
```
