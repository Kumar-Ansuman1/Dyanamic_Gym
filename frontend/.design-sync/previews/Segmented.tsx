import { Segmented } from 'frontend'
import { useState } from 'react'

export const PaymentMethod = () => {
  const [method, setMethod] = useState('upi')
  return (
    <Segmented
      label="Paid by"
      name="method"
      value={method}
      onChange={setMethod}
      options={[
        { value: 'cash', label: 'Cash' },
        { value: 'upi', label: 'UPI' },
        { value: 'card', label: 'Card' },
        { value: 'bank_transfer', label: 'Bank' },
        { value: 'other', label: 'Other' },
      ]}
    />
  )
}

export const Duration = () => {
  const [months, setMonths] = useState('3')
  return (
    <Segmented
      label="Duration"
      name="duration"
      value={months}
      onChange={setMonths}
      options={[
        { value: '1', label: '1 month' },
        { value: '3', label: '3 months' },
        { value: '6', label: '6 months' },
        { value: '12', label: '12 months' },
      ]}
    />
  )
}
