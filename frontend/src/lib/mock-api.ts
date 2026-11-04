import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import type {
  Member,
  MembershipPlan,
  Notification,
  Payment,
  PaymentMethod,
  PaymentStatus,
  ReminderType,
  Subscription,
} from '../types/api.ts'
import { addDays, daysUntil, toISODate } from './formatters.ts'

// Dev-only stand-in for the FastAPI backend (VITE_API_MOCK=true). Synthetic people, dates relative to today,
// and the same filters, errors and X-Total-Count as the real endpoints, so screens can be built without Postgres.
// To try a failure path, run in the console: window.__mockFail = 'POST payments'
// The next request starting with that method and path fails as if the connection dropped.

const today = toISODate(new Date())

const plans: MembershipPlan[] = [
  { id: 'plan-monthly', name: 'Monthly', duration_months: 1, price: '1200.00', is_active: true },
  { id: 'plan-quarterly', name: 'Quarterly', duration_months: 3, price: '3000.00', is_active: true },
  { id: 'plan-half', name: 'Half-yearly', duration_months: 6, price: '5500.00', is_active: true },
  { id: 'plan-annual', name: 'Annual', duration_months: 12, price: '10000.00', is_active: true },
  { id: 'plan-student', name: 'Student monthly', duration_months: 1, price: '900.00', is_active: false },
]

const people: [string, string, string, string | null][] = [
  ['GYM-0019', 'Mohammed Faiz', '98860 11223', null],
  ['GYM-0045', 'Nikhil Joshi', '99860 21457', 'nikhil.joshi@example.com'],
  ['GYM-0056', 'Rohit Verma', '98990 77665', null],
  ['GYM-0087', 'Arjun Mehta', '98765 43210', 'arjun.mehta@example.com'],
  ['GYM-0090', 'Deepak Nair', '94470 33221', null],
  ['GYM-0112', 'Vikram Singh', '98110 55667', null],
  ['GYM-0142', 'Priya Sharma', '98201 44321', 'priya.sharma@example.com'],
  ['GYM-0150', 'Shruti Agarwal', '98300 65471', null],
  ['GYM-0178', 'Ananya Rao', '97400 88990', null],
  ['GYM-0188', 'Varun Chopra', '98110 76540', null],
  ['GYM-0199', 'Arpita Das', '98300 44112', null],
  ['GYM-0203', 'Neha Kulkarni', '97690 30418', null],
  ['GYM-0210', 'Aditya Nair', '94460 22334', null],
  ['GYM-0222', 'Tanvi Desai', '98200 11987', null],
  ['GYM-0231', 'Sneha Iyer', '98450 12345', 'sneha.iyer@example.com'],
  ['GYM-0244', 'Rahul Kumar', '98765 43211', 'rahul@example.com'],
  ['GYM-0250', 'Pooja Bhatt', '98250 90012', null],
  ['GYM-0261', 'Aarav Shah', '98250 66554', null],
  ['GYM-0265', 'Siddharth Rao', '99020 18877', null],
  ['GYM-0276', 'Divya Menon', '98950 41236', null],
  ['GYM-0287', 'Karan Malhotra', '98105 33871', null],
  ['GYM-0298', 'Meera Pillai', '94470 66120', null],
  ['GYM-0301', 'Ishaan Kapoor', '98111 20304', null],
  ['GYM-0304', 'Kavya Reddy', '99001 23456', null],
]

const members: Member[] = people.map(([code, name, phone, email], i) => ({
  id: `member-${code}`,
  member_code: code,
  full_name: name,
  phone,
  email,
  joined_on: addDays(today, -700 + i * 25),
  is_active: code !== 'GYM-0045',
}))
let nextCode = 305

type Row = Omit<Subscription, 'member_name' | 'member_code' | 'amount_paid' | 'balance_due'>
type Allocation = { subscription_id: string; amount: string }
type StoredPayment = Omit<Payment, 'member_name' | 'member_code'> & { allocations: Allocation[] }

const subscriptions: Row[] = []
const payments: StoredPayment[] = []
let serial = 1

const METHODS: PaymentMethod[] = ['upi', 'cash', 'card', 'upi', 'bank_transfer']

function addPayment(memberId: string, amount: number, paidOn: string, allocations: Allocation[], status: PaymentStatus = 'recorded') {
  const method = METHODS[payments.length % METHODS.length]
  payments.push({
    id: `pay-${serial++}`,
    member_id: memberId,
    amount: amount.toFixed(2),
    method,
    status,
    reference: method === 'upi' ? `UPI-${4400 + payments.length * 37}` : null,
    paid_at: new Date(`${paidOn}T10:30:00`).toISOString(),
    notes: null,
    allocations,
  })
}

function makeSubscription(code: string, planId: string, endsIn: number, amountPaid: number) {
  const plan = plans.find((p) => p.id === planId)!
  const end = addDays(today, endsIn)
  const row: Row = {
    id: `sub-${code}-${end}`,
    member_id: `member-${code}`,
    plan_id: plan.id,
    start_date: addDays(end, -30 * plan.duration_months + 1),
    end_date: end,
    plan_name_snapshot: plan.name,
    duration_months_snapshot: plan.duration_months,
    price: plan.price,
    status: endsIn < 0 ? 'expired' : 'active',
    renewed_from_id: null,
  }
  subscriptions.push(row)
  if (amountPaid > 0) addPayment(row.member_id, amountPaid, row.start_date, [{ subscription_id: row.id, amount: amountPaid.toFixed(2) }])
}

// History first, then current memberships.
makeSubscription('GYM-0231', 'plan-monthly', -560, 1200)
makeSubscription('GYM-0231', 'plan-quarterly', -357, 3000)
makeSubscription('GYM-0045', 'plan-monthly', -60, 1200)
makeSubscription('GYM-0142', 'plan-quarterly', 0, 3000)
makeSubscription('GYM-0304', 'plan-monthly', 0, 1200)
makeSubscription('GYM-0087', 'plan-monthly', 1, 600)
makeSubscription('GYM-0112', 'plan-quarterly', 2, 3000)
makeSubscription('GYM-0231', 'plan-annual', 3, 10000)
makeSubscription('GYM-0178', 'plan-monthly', 5, 1200)
makeSubscription('GYM-0019', 'plan-half', 6, 5500)
makeSubscription('GYM-0056', 'plan-monthly', -4, 1200)
makeSubscription('GYM-0090', 'plan-quarterly', -9, 3000)
makeSubscription('GYM-0261', 'plan-monthly', 18, 1200)
makeSubscription('GYM-0199', 'plan-annual', 140, 10000)
addPayment('member-GYM-0304', 500, addDays(today, -20), [], 'refunded')

const amountPaid = (subscriptionId: string) =>
  payments
    .filter((p) => p.status === 'recorded')
    .flatMap((p) => p.allocations)
    .filter((a) => a.subscription_id === subscriptionId)
    .reduce((sum, a) => sum + Number(a.amount), 0)

function withDisplay(row: Row): Subscription {
  const member = members.find((m) => m.id === row.member_id)
  const paid = amountPaid(row.id)
  const due = row.status === 'cancelled' ? 0 : Math.max(Number(row.price) - paid, 0)
  return {
    ...row,
    member_name: member?.full_name ?? '',
    member_code: member?.member_code ?? '',
    amount_paid: paid.toFixed(2),
    balance_due: due.toFixed(2),
  }
}

function paymentOut({ allocations: _, ...payment }: StoredPayment): Payment {
  const member = members.find((m) => m.id === payment.member_id)
  return { ...payment, member_name: member?.full_name ?? '', member_code: member?.member_code ?? '' }
}

// Dashboard reminders the backend would have generated this past week: 7, 3 and 0 days before each end date.
type StoredNotification = Pick<Notification, 'id' | 'subscription_id' | 'member_id' | 'reminder_type' | 'read_at' | 'created_at'>
const REMINDERS: [number, ReminderType, string][] = [
  [7, 'seven_day', 'expires in 7 days'],
  [3, 'three_day', 'expires in 3 days'],
  [0, 'expiry_day', 'expires today'],
]
const notifications: StoredNotification[] = []
for (const s of subscriptions) {
  const left = daysUntil(s.end_date)
  for (const [days, type] of REMINDERS) {
    const ago = days - left
    if (left < 0 || ago < 0 || ago > 6) continue
    const sent = addDays(today, -ago)
    notifications.push({
      id: `note-${s.id}-${type}`,
      subscription_id: s.id,
      member_id: s.member_id,
      reminder_type: type,
      read_at: ago > 1 ? new Date(`${sent}T18:00:00`).toISOString() : null,
      created_at: new Date(`${sent}T06:00:00`).toISOString(),
    })
  }
}

function notificationOut(n: StoredNotification): Notification {
  const member = members.find((m) => m.id === n.member_id)!
  const subscription = subscriptions.find((s) => s.id === n.subscription_id)!
  const phrase = REMINDERS.find(([, type]) => type === n.reminder_type)![2]
  return {
    ...n,
    member_name: member.full_name,
    member_code: member.member_code,
    end_date: subscription.end_date,
    message: `${member.full_name}'s membership ${phrase}.`,
  }
}

class MockError extends Error {
  status: number
  headers: Record<string, string>
  constructor(status: number, message: string, headers: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.headers = headers
  }
}

/** A list endpoint's page; the adapter turns `total` into X-Total-Count. */
class Paged {
  rows: unknown[]
  total: number
  constructor(rows: unknown[], total: number) {
    this.rows = rows
    this.total = total
  }
}

type Params = Record<string, string | number | boolean | undefined>
type Body = Record<string, unknown>
type Handler = (params: Params, body: Body, match: RegExpMatchArray) => unknown

const paged = <T>(rows: T[], p: Params) => {
  const skip = Number(p.skip ?? 0)
  return new Paged(rows.slice(skip, skip + Number(p.limit ?? 20)), rows.length)
}
const flag = (value: unknown) => (value === undefined ? undefined : String(value) === 'true')
const has = (text: string | null, term: string) => (text ?? '').toLowerCase().includes(term)
const digits = (phone: string) => phone.replace(/\D/g, '')

const findMember = (id: string) => {
  const member = members.find((m) => m.id === id)
  if (!member) throw new MockError(404, 'Member not found')
  return member
}
const findPlan = (id: unknown) => {
  const plan = plans.find((p) => p.id === id)
  if (!plan) throw new MockError(404, 'Membership plan not found.')
  return plan
}
const findSubscription = (id: string) => {
  const row = subscriptions.find((s) => s.id === id)
  if (!row) throw new MockError(404, 'Subscription not found.')
  return row
}

function startSubscription(member: Member, plan: MembershipPlan, start: string, renewedFrom: string | null): Row {
  if (!member.is_active) throw new MockError(422, 'Cannot create a subscription for an inactive member.')
  if (!plan.is_active) throw new MockError(422, 'Cannot use an inactive membership plan.')
  const row: Row = {
    id: `sub-new-${serial++}`,
    member_id: member.id,
    plan_id: plan.id,
    plan_name_snapshot: plan.name,
    duration_months_snapshot: plan.duration_months,
    price: plan.price,
    start_date: start,
    end_date: addDays(start, 30 * plan.duration_months - 1),
    status: start > today ? 'pending' : 'active',
    renewed_from_id: renewedFrom,
  }
  subscriptions.push(row)
  return row
}

const routes: [string, RegExp, Handler][] = [
  ['POST', /^auth\/login$/, () => ({ access_token: 'mock-token', token_type: 'bearer' })],
  ['GET', /^auth\/me$/, () => ({ id: 'owner', name: 'Gym owner', email: 'owner@example.com', is_active: true })],

  // Members
  [
    'GET',
    /^members$/,
    (p) => {
      const term = String(p.search ?? '').toLowerCase()
      const active = flag(p.is_active)
      const rows = members
        .filter((m) => (active === undefined || m.is_active === active) && [m.full_name, m.phone, m.member_code].some((v) => has(v, term)))
        .sort((a, b) => b.member_code.localeCompare(a.member_code))
      return paged(rows, p)
    },
  ],
  ['GET', /^members\/([^/]+)$/, (_p, _b, match) => findMember(match[1])],
  [
    'POST',
    /^members$/,
    (_p, body) => {
      const phone = String(body.phone ?? '')
      const existing = members.find((m) => digits(m.phone) === digits(phone))
      if (existing) {
        throw new MockError(409, `${existing.full_name} (${existing.member_code}) is already registered with this phone number.`, {
          location: `/api/members/${existing.id}`,
        })
      }
      const code = `GYM-${String(nextCode++).padStart(4, '0')}`
      const member: Member = {
        id: `member-${code}`,
        member_code: code,
        full_name: String(body.full_name),
        phone,
        email: (body.email as string | null) ?? null,
        joined_on: String(body.joined_on),
        is_active: true,
      }
      members.push(member)
      return member
    },
  ],
  ['PUT', /^members\/([^/]+)$/, (_p, body, match) => Object.assign(findMember(match[1]), body)],
  ['PATCH', /^members\/([^/]+)\/status$/, (_p, body, match) => Object.assign(findMember(match[1]), { is_active: Boolean(body.is_active) })],

  // Plans
  [
    'GET',
    /^membership-plans$/,
    (p) => {
      const term = String(p.search ?? '').toLowerCase()
      const active = flag(p.is_active)
      return paged(
        plans.filter((plan) => (active === undefined || plan.is_active === active) && has(plan.name, term)),
        p,
      )
    },
  ],
  [
    'POST',
    /^membership-plans$/,
    (_p, body) => {
      const name = String(body.name).trim()
      if (plans.some((plan) => plan.name.toLowerCase() === name.toLowerCase())) {
        throw new MockError(409, 'A membership plan with this name may already exist.')
      }
      const plan: MembershipPlan = {
        id: `plan-${serial++}`,
        name,
        duration_months: Number(body.duration_months),
        price: Number(body.price).toFixed(2),
        is_active: true,
      }
      plans.unshift(plan)
      return plan
    },
  ],
  [
    'PATCH',
    /^membership-plans\/([^/]+)$/,
    (_p, body, match) => {
      const plan = findPlan(match[1])
      const name = String(body.name ?? plan.name).trim()
      if (plans.some((other) => other !== plan && other.name.toLowerCase() === name.toLowerCase())) {
        throw new MockError(409, 'The plan name conflicts with an existing plan.')
      }
      return Object.assign(plan, body, { name, price: Number(body.price ?? plan.price).toFixed(2) })
    },
  ],
  ['PATCH', /^membership-plans\/([^/]+)\/status$/, (_p, body, match) => Object.assign(findPlan(match[1]), { is_active: Boolean(body.is_active) })],

  // Subscriptions
  [
    'GET',
    /^subscriptions$/,
    (p) => {
      let rows = subscriptions.filter(
        (s) =>
          (!p.status || s.status === p.status) &&
          (!p.member_id || s.member_id === p.member_id) &&
          (!p.ends_from || s.end_date >= String(p.ends_from)) &&
          (!p.ends_to || s.end_date <= String(p.ends_to)),
      )
      if (p.not_renewed) {
        rows = rows.filter(
          (s) =>
            !subscriptions.some(
              (later) =>
                later.member_id === s.member_id &&
                later.id !== s.id &&
                (later.status === 'active' || later.status === 'pending') &&
                later.end_date > s.end_date,
            ),
        )
      }
      let out = rows.map(withDisplay)
      if (p.has_balance) out = out.filter((s) => s.status !== 'cancelled' && Number(s.balance_due) > 0)
      if (p.sort === 'ending') out.sort((a, b) => a.end_date.localeCompare(b.end_date))
      else out.reverse() // newest first, like created_at desc
      return paged(out, p)
    },
  ],
  ['GET', /^subscriptions\/([^/]+)$/, (_p, _b, match) => withDisplay(findSubscription(match[1]))],
  [
    'POST',
    /^subscriptions$/,
    (_p, body) => withDisplay(startSubscription(findMember(String(body.member_id)), findPlan(body.plan_id), String(body.start_date), null)),
  ],
  [
    'POST',
    /^subscriptions\/([^/]+)\/renew$/,
    (_p, body, match) => {
      const previous = findSubscription(match[1])
      if (previous.status === 'cancelled') throw new MockError(422, 'A cancelled subscription cannot be renewed.')
      if (subscriptions.some((s) => s.renewed_from_id === previous.id)) {
        throw new MockError(422, 'This subscription has already been renewed.')
      }
      const dayAfterEnd = addDays(previous.end_date, 1)
      const start = dayAfterEnd > today ? dayAfterEnd : today
      const member = findMember(previous.member_id)
      return withDisplay(startSubscription(member, findPlan(body.plan_id ?? previous.plan_id), start, previous.id))
    },
  ],
  [
    'PATCH',
    /^subscriptions\/([^/]+)\/cancel$/,
    (_p, _b, match) => {
      const row = findSubscription(match[1])
      if (row.status === 'cancelled' || row.status === 'expired') {
        throw new MockError(422, `Cannot cancel a subscription with status '${row.status}'.`)
      }
      row.status = 'cancelled'
      return withDisplay(row)
    },
  ],

  // Payments
  [
    'GET',
    /^payments$/,
    (p) =>
      paged(
        payments
          .filter((pay) => (!p.member_id || pay.member_id === p.member_id) && (!p.status || pay.status === p.status))
          .sort((a, b) => b.paid_at.localeCompare(a.paid_at))
          .map(paymentOut),
        p,
      ),
  ],
  [
    'GET',
    /^payments\/([^/]+)$/,
    (_p, _b, match) => {
      const payment = payments.find((pay) => pay.id === match[1])
      if (!payment) throw new MockError(404, 'Payment not found.')
      return {
        ...paymentOut(payment),
        allocations: payment.allocations.map((a, i) => ({ id: `${payment.id}-a${i}`, payment_id: payment.id, ...a })),
      }
    },
  ],
  [
    'POST',
    /^payments$/,
    (_p, body) => {
      const member = findMember(String(body.member_id))
      if (!member.is_active) throw new MockError(422, 'Cannot record a payment for an inactive member.')
      const allocations = (body.allocations ?? []) as Allocation[]
      if (allocations.reduce((sum, a) => sum + Number(a.amount), 0) > Number(body.amount)) {
        throw new MockError(422, 'The total allocated amount cannot exceed the payment amount.')
      }
      for (const allocation of allocations) {
        const row = findSubscription(allocation.subscription_id)
        if (row.status === 'cancelled') throw new MockError(422, 'Payments cannot be allocated to a cancelled subscription.')
        const due = Number(row.price) - amountPaid(row.id)
        if (Number(allocation.amount) > due) {
          throw new MockError(422, `Allocation exceeds the remaining balance for this subscription (₹${due} due).`)
        }
      }
      const payment: StoredPayment = {
        id: `pay-${serial++}`,
        member_id: member.id,
        amount: Number(body.amount).toFixed(2),
        method: (body.method as PaymentMethod) ?? 'cash',
        status: 'recorded',
        reference: (body.reference as string | null) ?? null,
        paid_at: (body.paid_at as string) ?? new Date().toISOString(),
        notes: (body.notes as string | null) ?? null,
        allocations: allocations.map((a) => ({ subscription_id: a.subscription_id, amount: Number(a.amount).toFixed(2) })),
      }
      payments.push(payment)
      return paymentOut(payment)
    },
  ],

  // Notifications
  [
    'GET',
    /^notifications$/,
    (p) =>
      paged(
        notifications
          .filter((n) => !flag(p.unread_only) || n.read_at === null)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map(notificationOut),
        p,
      ),
  ],
  ['GET', /^notifications\/unread-count$/, () => ({ count: notifications.filter((n) => n.read_at === null).length })],
  [
    'PATCH',
    /^notifications\/([^/]+)\/read$/,
    (_p, _b, match) => {
      const note = notifications.find((n) => n.id === match[1])
      if (!note) throw new MockError(404, 'Notification not found.')
      note.read_at ??= new Date().toISOString()
      return notificationOut(note)
    },
  ],
]

const response = (config: InternalAxiosRequestConfig, status: number, data: unknown, headers = {}): AxiosResponse => ({
  data,
  status,
  statusText: '',
  headers,
  config,
})

export const mockAdapter: AxiosAdapter = async (config) => {
  await new Promise((resolve) => setTimeout(resolve, 350))
  const method = (config.method ?? 'get').toUpperCase()
  const path = (config.url ?? '').replace(/^\/+/, '')
  const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data ?? {})

  const forced = (window as { __mockFail?: string }).__mockFail
  if (forced && `${method} ${path}`.startsWith(forced)) {
    delete (window as { __mockFail?: string }).__mockFail
    throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, null)
  }

  for (const [routeMethod, pattern, handle] of routes) {
    const match = path.match(pattern)
    if (routeMethod !== method || !match) continue
    try {
      // Copies, so a later in-place update here never mutates what the query cache holds.
      const result = handle(config.params ?? {}, body, match)
      return result instanceof Paged
        ? response(config, 200, structuredClone(result.rows), { 'x-total-count': String(result.total) })
        : response(config, 200, structuredClone(result))
    } catch (error) {
      if (!(error instanceof MockError)) throw error
      const failed = response(config, error.status, { detail: error.message }, error.headers)
      throw new AxiosError(error.message, String(error.status), config, null, failed)
    }
  }
  throw new AxiosError('Not found.', '404', config, null, response(config, 404, { detail: 'Not found.' }))
}
