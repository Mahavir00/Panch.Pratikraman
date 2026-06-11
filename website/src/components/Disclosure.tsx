import { useState } from 'react'
import type { ReactNode } from 'react'

/** Progressive-disclosure block; collapsed by default for scholarly layers. */
export function Disclosure({
  title,
  children,
  defaultOpen = false,
  icon,
  count,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  icon?: ReactNode
  count?: number
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2"
      >
        {icon && <span className="text-saffron">{icon}</span>}
        <span className="flex-1 font-medium">{title}</span>
        {typeof count === 'number' && <span className="chip">{count}</span>}
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="border-t border-line px-4 py-4 animate-fade-in">{children}</div>}
    </div>
  )
}
