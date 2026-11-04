import { Colon } from './Segment.tsx'

// DYNAMIC:GYM, the clock colon standing in for the space.
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center font-extrabold uppercase leading-none tracking-[0.02em] [font-stretch:125%] ${className}`}
    >
      Dynamic
      <Colon className="h-[0.72em]" />
      <span className="sr-only"> </span>
      Gym
    </span>
  )
}
