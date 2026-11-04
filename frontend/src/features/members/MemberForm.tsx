import { zodResolver } from '@hookform/resolvers/zod'
import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../components/ui/Button.tsx'
import { TextField } from '../../components/ui/Field.tsx'
import { toISODate } from '../../lib/formatters.ts'

// Limits mirror MemberCreate/MemberUpdate in backend/app/schemas/member.py.
const schema = z.object({
  full_name: z.string().trim().min(2, 'Enter their full name.').max(150, 'Keep the name under 150 characters.'),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a phone number, like 98450 12345.'),
  email: z.union([z.literal(''), z.email('Enter a valid email, or leave it empty.')]),
  joined_on: z.iso.date('Pick the date they joined.').refine((d) => d <= toISODate(new Date()), "Joining date can't be in the future."),
})

export type MemberValues = z.infer<typeof schema>

/** The API wants null, not "", for no email. */
export const toMemberBody = (values: MemberValues) => ({ ...values, email: values.email || null })

type MemberFormProps = {
  defaultValues: MemberValues
  submitLabel: string
  pending: boolean
  /** Why the server refused; may carry a link (duplicate phone). */
  error?: ReactNode
  onSubmit: (values: MemberValues) => void
  onCancel?: () => void
}

export function MemberForm({ defaultValues, submitLabel, pending, error, onSubmit, onCancel }: MemberFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberValues>({ resolver: zodResolver(schema), defaultValues })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 md:grid-cols-2 md:gap-x-6">
      <TextField label="Full name" autoComplete="off" error={errors.full_name?.message} {...register('full_name')} />
      <TextField label="Phone" type="tel" inputMode="tel" autoComplete="off" error={errors.phone?.message} {...register('phone')} />
      <TextField
        label="Email (optional)"
        type="email"
        autoComplete="off"
        error={errors.email?.message}
        {...register('email')}
      />
      <TextField label="Joined on" type="date" max={toISODate(new Date())} error={errors.joined_on?.message} {...register('joined_on')} />
      {error && (
        <div role="alert" className="flex items-start gap-1.5 text-[0.8125rem] text-led md:col-span-2">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <div>{error}</div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 md:col-span-2">
        <Button variant="primary" type="submit" loading={pending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="quiet" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
