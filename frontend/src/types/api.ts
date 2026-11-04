// Mirrors backend/app/models/enums.py and backend/app/schemas. Keep in sync with the FastAPI schemas.
export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'cancelled'
export type PaymentStatus = 'recorded' | 'reversed' | 'refunded'
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'card' | 'other'
export type ReminderType = 'seven_day' | 'three_day' | 'expiry_day'

// Decimals arrive as strings ("3000.00"); dates as ISO "YYYY-MM-DD".
export type Member = {
  id: string
  member_code: string
  full_name: string
  phone: string
  email: string | null
  joined_on: string
  is_active: boolean
}

export type MembershipPlan = {
  id: string
  name: string
  duration_months: number
  price: string
  is_active: boolean
}

export type Subscription = {
  id: string
  member_id: string
  plan_id: string
  start_date: string
  end_date: string
  plan_name_snapshot: string
  duration_months_snapshot: number
  price: string
  status: SubscriptionStatus
  renewed_from_id: string | null
  member_name: string
  member_code: string
  amount_paid: string
  balance_due: string
}

export type SubscriptionQuery = {
  member_id?: string
  status?: SubscriptionStatus
  ends_from?: string
  ends_to?: string
  not_renewed?: boolean
  has_balance?: boolean
  sort?: 'recent' | 'ending'
  skip?: number
  limit?: number
}

export type Payment = {
  id: string
  member_id: string
  amount: string
  method: PaymentMethod
  status: PaymentStatus
  reference: string | null
  /** ISO timestamp with timezone. */
  paid_at: string
  notes: string | null
  member_name: string
  member_code: string
}

export type PaymentAllocation = { id: string; payment_id: string; subscription_id: string; amount: string }
export type PaymentDetail = Payment & { allocations: PaymentAllocation[] }

export type Notification = {
  id: string
  subscription_id: string
  member_id: string
  member_name: string
  member_code: string
  end_date: string
  reminder_type: ReminderType
  message: string
  read_at: string | null
  created_at: string
}

/** One page of a list endpoint, with the X-Total-Count the backend sends. */
export type Page<T> = { rows: T[]; total: number }

export type TokenResponse = { access_token: string; token_type: string }
export type UnreadCount = { count: number }
