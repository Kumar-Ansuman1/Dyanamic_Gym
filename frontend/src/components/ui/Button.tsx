import { LoaderCircle } from 'lucide-react'
import { useState, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'quiet'

// Red means "act now" (renew, collect). Destructive actions never get the red fill.
const VARIANT: Record<Variant, string> = {
  primary: 'bg-led text-ink hover:bg-led-bright active:bg-led-deep',
  secondary: 'border border-rule-strong text-fg hover:border-fg-muted hover:bg-raised',
  danger: 'border border-led text-led hover:bg-led/10',
  quiet: 'px-1 text-fg-muted hover:text-fg hover:underline',
}

const SIZE = {
  md: 'h-11 px-4 text-sm md:h-10',
  sm: 'h-9 px-3 text-[0.8125rem] md:h-8',
}

type Size = keyof typeof SIZE

/** Button styling for elements that must stay links (navigation), e.g. <Link className={buttonClass('secondary')}>. */
export const buttonClass = (variant: Variant = 'secondary', size: Size = 'md', className = '') =>
  `inline-flex shrink-0 items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors duration-150 select-none disabled:cursor-not-allowed disabled:opacity-40 ${SIZE[size]} ${VARIANT[variant]} ${className}`

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

type ConfirmButtonProps = {
  /** "Deactivate member" */
  label: string
  /** "Deactivate Sneha Iyer?" */
  question: string
  /** "Deactivate" */
  confirm: string
  onConfirm: () => void
  pending?: boolean
  size?: Size
  /** The first button. Rows of a list use 'quiet' so a column of them isn't a wall of red. */
  variant?: 'danger' | 'quiet'
}

// Destructive actions ask once, in place: the button becomes the question, a danger confirm and a way out.
export function ConfirmButton({ label, question, confirm, onConfirm, pending = false, size = 'md', variant = 'danger' }: ConfirmButtonProps) {
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <Button variant={variant} size={size} onClick={() => setAsking(true)}>
        {label}
      </Button>
    )
  }
  return (
    <span role="group" aria-label={question} className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-sm">{question}</span>
      <Button variant="danger" size={size} loading={pending} onClick={onConfirm} autoFocus>
        {confirm}
      </Button>
      <Button variant="quiet" size={size} onClick={() => setAsking(false)}>
        Cancel
      </Button>
    </span>
  )
}
