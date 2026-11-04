// Seven-segment LED digits, drawn like the interval timer on a gym wall:
// lit segments in LED red, unlit segments ghosting behind them. No glow.

type Seg = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g'

const LIT: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abdeg',
  '3': 'abcdg',
  '4': 'bcfg',
  '5': 'acdfg',
  '6': 'acdefg',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  '-': 'g',
  ' ': '',
}

const W = 50
const H = 92
const T = 9 // segment thickness
const h = T / 2
const GAP = 1.5
const SLANT = 13 // H * tan(8deg), room for the italic lean

const hSeg = (y: number) => {
  const x0 = h + GAP
  const x1 = W - h - GAP
  return `${x0},${y} ${x0 + h},${y - h} ${x1 - h},${y - h} ${x1},${y} ${x1 - h},${y + h} ${x0 + h},${y + h}`
}

const vSeg = (x: number, top: number, bottom: number) => {
  const y0 = top + GAP
  const y1 = bottom - GAP
  return `${x},${y0} ${x + h},${y0 + h} ${x + h},${y1 - h} ${x},${y1} ${x - h},${y1 - h} ${x - h},${y0 + h}`
}

const SEGMENTS: [Seg, string][] = [
  ['a', hSeg(h)],
  ['b', vSeg(W - h, h, H / 2)],
  ['c', vSeg(W - h, H / 2, H - h)],
  ['d', hSeg(H - h)],
  ['e', vSeg(h, H / 2, H - h)],
  ['f', vSeg(h, h, H / 2)],
  ['g', hSeg(H / 2)],
]

function Digit({ char }: { char: string }) {
  const lit = LIT[char] ?? ''
  return (
    <svg
      viewBox={`0 0 ${W + SLANT} ${H}`}
      style={{ height: '1em', width: `${(W + SLANT) / H}em` }}
      aria-hidden
    >
      <g transform={`translate(${SLANT} 0) skewX(-8)`}>
        {SEGMENTS.map(([seg, points]) => (
          <polygon key={seg} points={points} className={lit.includes(seg) ? 'fill-led' : 'fill-led-ghost'} />
        ))}
      </g>
    </svg>
  )
}

type SegmentDisplayProps = {
  /** Digits, "-" or space. A space renders as a fully unlit cell, like a real display. */
  value: string
  /** What a screen reader hears, e.g. "3 days left". */
  label: string
  className?: string
}

export function SegmentDisplay({ value, label, className = '' }: SegmentDisplayProps) {
  return (
    <span role="img" aria-label={label} className={`inline-flex gap-[0.09em] leading-none ${className}`}>
      {[...value].map((char, i) => (
        <Digit key={i} char={char} />
      ))}
    </span>
  )
}

/** Days left as a two-cell countdown (a third cell past 99, so an annual plan never under-reads). Lapsed shows "--". */
export function DaysLeft({ days, className = '' }: { days: number; className?: string }) {
  const value = days < 0 ? '--' : String(Math.min(days, 999)).padStart(2, ' ')
  const label = days < 0 ? 'Lapsed' : days === 0 ? 'Ends today' : `${days} ${days === 1 ? 'day' : 'days'} left`
  return <SegmentDisplay value={value} label={label} className={className} />
}

/** The clock colon: two lit squares. Used as the wordmark separator and as a ticking mark. */
export function Colon({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-flex flex-col justify-center gap-[0.2em] px-[0.14em] ${className}`}>
      <i className="block size-[0.17em] bg-led" />
      <i className="block size-[0.17em] bg-led" />
    </span>
  )
}
