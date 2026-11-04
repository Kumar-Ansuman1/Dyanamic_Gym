---
category: Feedback
---
Empty and error state block. Empty has a dashed frame and says what will appear here. Error has an LED-red frame, says what failed and how to recover, and is announced as an alert.

- Empty title: a plain statement ("No one expires this week."). Body: what will show up and when.
- Error title: what failed ("Couldn't load expiring memberships."). Body: the next step. Pass a Retry `Button` as `action`.
- Never use it for success toasts or marketing banners.

```jsx
<Notice tone="error" title="Couldn't load expiring memberships." action={<Button size="sm">Retry</Button>}>
  The server didn't respond. Check the connection, then retry.
</Notice>
```
