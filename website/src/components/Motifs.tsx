import type { SVGProps } from 'react'

/** Wordmark emblem — a stylized lotus within a soft frame. */
export function LotusMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
      <g
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M24 39c-7 0-12-4-12-9 5-1 9 1 12 6 3-5 7-7 12-6 0 5-5 9-12 9Z" />
        <path d="M24 39c-1.6-5.5-1.6-11.5 0-17 1.6 5.5 1.6 11.5 0 17Z" />
        <path d="M24 39c-4-4.5-6-9-6-14 4 2 6 6.5 6 11" />
        <path d="M24 39c4-4.5 6-9 6-14-4 2-6 6.5-6 11" />
        <circle cx="24" cy="13" r="2.4" fill="currentColor" stroke="none" />
      </g>
    </svg>
  )
}

/** Daṇḍa (॥) section divider with a small lotus node — used between sections. */
export function DandaDivider({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-3 text-gold ${className}`}
      role="separator"
      aria-hidden="true"
    >
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/60" />
      <svg viewBox="0 0 36 16" className="h-4 w-9" fill="none">
        <path d="M6 1v14M30 1v14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="18" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="18" cy="8" r="0.9" fill="currentColor" />
      </svg>
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/60" />
    </div>
  )
}

/** Faint mandala used as a background ornament behind hero/section headers. */
export function MandalaGlyph(props: SVGProps<SVGSVGElement>) {
  const petals = Array.from({ length: 16 })
  return (
    <svg viewBox="0 0 200 200" fill="none" aria-hidden="true" {...props}>
      <g stroke="currentColor" strokeWidth="1" opacity="0.9">
        <circle cx="100" cy="100" r="92" />
        <circle cx="100" cy="100" r="70" />
        <circle cx="100" cy="100" r="44" />
        <circle cx="100" cy="100" r="20" />
        {petals.map((_, i) => {
          const a = (i / petals.length) * Math.PI * 2
          return (
            <path
              key={i}
              d="M100 8 C112 40 112 60 100 80 C88 60 88 40 100 8 Z"
              transform={`rotate(${(a * 180) / Math.PI} 100 100)`}
            />
          )
        })}
      </g>
    </svg>
  )
}

/** Corner flourish for manuscript-style framing. */
export function CornerFlourish({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
      <path
        d="M2 38V14C2 7 7 2 14 2h24"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M8 38V16C8 11 11 8 16 8h22" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="14" cy="2" r="1.6" fill="currentColor" />
    </svg>
  )
}

/** Open-palm "Ahiṁsā" emblem (refined, used sparingly e.g. on About). */
export function AhimsaMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" {...props}>
      <path
        d="M20 58V30c0-10 2-16 4-16s3 4 3 12V12c0-3 1.5-5 3.5-5S34 9 34 12v10c0-3 1.5-5 3.5-5S41 19 41 22v6c0-3 1.5-4 3-4s3 1.5 3 5v9c0 12-6 20-16 20-8 0-14-2-14-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="36" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M32 33v6M29 36h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
