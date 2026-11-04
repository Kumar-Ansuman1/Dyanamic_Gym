---
category: Countdown
---
Seven-segment LED digits, like the interval timer on a gym wall: lit segments in LED red, unlit segments ghosting behind. This is the system's signature, so use it sparingly.

- Only for countdowns and a few key figures (days left, unread count). Never for names, money or table text.
- Sized by font-size: the digits are 1em tall. Set the size with `className` (e.g. `text-[2rem]`) or a wrapping `style={{ fontSize: 32 }}`.
- `value` accepts digits, "-" and space; a space is a fully unlit cell. `label` is what screen readers hear.
- No glow, no blur, no shadow. Realism comes from the ghosted unlit segments.

```jsx
<div style={{ fontSize: 64 }}>
  <SegmentDisplay value=" 3" label="3 days left" />
</div>
```
