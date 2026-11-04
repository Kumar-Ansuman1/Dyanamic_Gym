import { ChevronDown, TriangleAlert } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'

const BOX =
  'flex h-11 items-center border border-rule bg-panel hover:border-rule-strong focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-fg has-[[aria-invalid=true]]:border-led md:h-10'

const CONTROL =
  'h-full w-full min-w-0 bg-transparent px-3 text-base text-fg tabular-nums placeholder:text-fg-faint focus-visible:outline-none md:text-[0.9375rem]'

type Frame = { label: string; hint?: string; error?: string }

function Shell({ id, label, hint, error, children }: Frame & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.8125rem] font-medium text-fg-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="flex items-center gap-1.5 text-[0.8125rem] text-led">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-msg`} className="text-[0.8125rem] text-fg-faint">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

// ComponentProps (not InputHTMLAttributes) so React 19's ref-as-prop reaches the <input> (React Hook Form's register).
type TextFieldProps = ComponentProps<'input'> & Frame & { prefix?: string }

export function TextField({ label, hint, error, prefix, id, ...props }: TextFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <Shell id={fieldId} label={label} hint={hint} error={error}>
      <div className={BOX}>
        {prefix && (
          <span className="pl-3 text-fg-muted" aria-hidden>
            {prefix}
          </span>
        )}
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
          className={`${CONTROL} ${prefix ? 'pl-1.5' : ''}`}
          {...props}
        />
      </div>
    </Shell>
  )
}

type SelectFieldProps = ComponentProps<'select'> & Frame

export function SelectField({ label, hint, error, id, children, ...props }: SelectFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <Shell id={fieldId} label={label} hint={hint} error={error}>
      <div className={`${BOX} relative`}>
        <select
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
          className={`${CONTROL} cursor-pointer appearance-none pr-9`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 size-4 text-fg-muted" aria-hidden />
      </div>
    </Shell>
  )
}

type SegmentedProps<T extends string> = {
  label: string
  name: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

// Radio group drawn as a row of switch positions; the chosen one lights up off-white.
// Too many positions for a phone: the row scrolls sideways rather than breaking onto a second line.
export function Segmented<T extends string>({ label, name, options, value, onChange }: SegmentedProps<T>) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-[0.8125rem] font-medium text-fg-muted">{label}</legend>
      <div className="flex w-fit max-w-full overflow-x-auto border border-rule [scrollbar-width:none]">
        {options.map((option) => (
          <label key={option.value} className="shrink-0 cursor-pointer [&:not(:first-child)]:border-l [&:not(:first-child)]:border-rule">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="flex h-11 items-center px-3.5 text-sm font-medium text-fg-muted transition-colors duration-150 peer-checked:bg-fg peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-4 peer-focus-visible:outline-fg peer-checked:peer-focus-visible:outline-ink hover:text-fg peer-checked:hover:text-ink md:h-10">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
