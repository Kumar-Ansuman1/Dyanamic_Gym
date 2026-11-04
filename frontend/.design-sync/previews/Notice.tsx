import { Button, Notice } from 'frontend'

const box = { maxWidth: 520 } as const

export const Empty = () => (
  <div style={box}>
    <Notice title="No one expires this week.">
      Members whose plan ends in the next 7 days show up here, with a Renew button on each.
    </Notice>
  </div>
)

export const Error = () => (
  <div style={box}>
    <Notice
      tone="error"
      title="Couldn't load expiring memberships."
      action={
        <Button size="sm">
          Retry
        </Button>
      }
    >
      The server didn't respond. Check the connection, then retry.
    </Notice>
  </div>
)

export const FirstRun = () => (
  <div style={box}>
    <Notice title="Create your plans first." action={<Button variant="primary">Add a plan</Button>}>
      Every membership starts from a plan, like Monthly at ₹1,200. Add the plans the gym sells, then register members.
    </Notice>
  </div>
)
