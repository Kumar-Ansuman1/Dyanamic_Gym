import { useQuery } from '@tanstack/react-query'
import type { RenewInput, RenewPlan } from '../../components/ui/ExpiryRow.tsx'
import { api, errorMessage } from '../../lib/api-client.ts'
import { formatDate, formatINR, toISODate } from '../../lib/formatters.ts'
import type { Member, MembershipPlan, Subscription } from '../../types/api.ts'

/** Every plan a member can be put on today. */
export const activePlansQuery = {
  queryKey: ['plans', 'active'],
  queryFn: () => api.get<MembershipPlan[]>('/membership-plans', { params: { is_active: true, limit: 100 } }).then((r) => r.data),
}

/** Active plans as the renew form wants them: "3000", not "3000.00". */
export const usePlanOptions = () =>
  useQuery({
    ...activePlansQuery,
    select: (plans): RenewPlan[] => plans.map((p) => ({ id: p.id, name: p.name, price: p.price.replace(/\.00$/, '') })),
  })

/** The membership was saved but the payment wasn't. Its message says so plainly. */
export class PaymentNotRecorded extends Error {}

const AMOUNT = /^\d+(\.\d{1,2})?$/

/** Why a renew form can't be sent, or null. Checked before renewing: an overpayment would renew first and then fail to record. */
export function checkRenewInput(input: RenewInput, plans: RenewPlan[]): string | null {
  const amount = input.amount.trim()
  if (amount && !AMOUNT.test(amount)) return 'Enter the amount as a number, like 3000.'
  const price = plans.find((p) => p.id === input.planId)?.price
  if (price && Number(amount) > Number(price)) return `That's more than the ${formatINR(price)} plan price. Lower the amount.`
  return null
}

async function collect(subscription: Subscription, input: RenewInput, done: string) {
  const amount = input.amount.trim()
  if (!amount || Number(amount) <= 0) return amount
  try {
    await api.post('/payments', {
      member_id: subscription.member_id,
      amount,
      method: input.method,
      reference: input.reference.trim() || null,
      allocations: [{ subscription_id: subscription.id, amount }],
    })
  } catch (error) {
    throw new PaymentNotRecorded(
      `${done}, but the ${formatINR(amount)} payment wasn't recorded: ${errorMessage(error)} Record it from Payments.`,
    )
  }
  return amount
}

/** Renew, then record the payment against the new subscription. */
export async function renewAndCollect({ subscription, input }: { subscription: Subscription; input: RenewInput }) {
  const { data: renewed } = await api.post<Subscription>(`/subscriptions/${subscription.id}/renew`, { plan_id: input.planId })
  const amount = await collect(renewed, input, `Renewed ${subscription.member_name}`)
  return { renewed, amount }
}

/** First plan for a member with nothing to renew: starts today. */
export async function startAndCollect({ member, input }: { member: Member; input: RenewInput }) {
  const { data: renewed } = await api.post<Subscription>('/subscriptions', {
    member_id: member.id,
    plan_id: input.planId,
    start_date: toISODate(new Date()),
  })
  const amount = await collect(renewed, input, `Started ${member.full_name} on ${renewed.plan_name_snapshot}`)
  return { renewed, amount }
}

/** "Renewed Priya Sharma on Quarterly until 28 Jan 2027. ₹3,000 recorded." */
export const renewedText = ({ renewed, amount }: { renewed: Subscription; amount: string }, verb = 'Renewed') =>
  `${verb} ${renewed.member_name} on ${renewed.plan_name_snapshot} until ${formatDate(renewed.end_date)}. ${
    amount && Number(amount) > 0 ? `${formatINR(amount)} recorded.` : 'Payment still due.'
  }`
