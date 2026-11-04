import { TextField } from 'frontend'

const stack = { display: 'grid', gap: 20, maxWidth: 420 } as const

export const Filled = () => (
  <div style={stack}>
    <TextField label="Full name" defaultValue="Sneha Iyer" />
    <TextField label="Email (optional)" type="email" placeholder="name@example.com" hint="For receipts. Leave blank if they don't have one." />
  </div>
)

export const Error = () => (
  <div style={stack}>
    <TextField
      label="Phone"
      inputMode="tel"
      defaultValue="98450 12345"
      error="This number already belongs to GYM-0142 Priya Sharma. Open that profile instead."
    />
  </div>
)

export const Money = () => (
  <div style={stack}>
    <TextField
      label="Amount received"
      prefix="₹"
      inputMode="decimal"
      defaultValue="3000"
      hint="Leave the full price unless they pay part now."
    />
    <TextField label="Joined on" type="date" defaultValue="2026-10-30" />
  </div>
)
