---
category: Brand
---
Root ground for every Dynamic Gym screen: panel-black background, off-white text, Archivo at 15px. Every other component is drawn for this ground and turns unreadable on white, so wrap the whole design in one Surface.

- One Surface at the root, with `minHeight: '100vh'` for full screens. Don't nest Surfaces.
- Section dividers are 1px `var(--color-rule)`. Corners are always square.

```jsx
<Surface style={{ minHeight: '100vh', padding: 24 }}>
  <Wordmark />
</Surface>
```
