import type { HTMLAttributes } from 'react'

// The panel-black ground every component is drawn for. The app gets it from <html>;
// anything rendered elsewhere (embeds, design tools) wraps its root in Surface.
export function Surface({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-ink font-sans text-[0.9375rem] leading-normal text-fg antialiased ${className}`} {...props} />
}
