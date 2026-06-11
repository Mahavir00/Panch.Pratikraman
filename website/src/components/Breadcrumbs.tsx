import { Link } from 'react-router-dom'
import { Fragment } from 'react'

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="no-print border-b border-line bg-surface/60">
      <div className="container-page flex items-center gap-2 overflow-x-auto py-2.5 text-sm text-muted">
        {items.map((c, i) => {
          const last = i === items.length - 1
          return (
            <Fragment key={i}>
              {i > 0 && <span aria-hidden="true" className="text-line">›</span>}
              {c.to && !last ? (
                <Link to={c.to} className="whitespace-nowrap hover:text-maroon">
                  {c.label}
                </Link>
              ) : (
                <span className={`whitespace-nowrap ${last ? 'font-medium text-ink' : ''}`} aria-current={last ? 'page' : undefined}>
                  {c.label}
                </span>
              )}
            </Fragment>
          )
        })}
      </div>
    </nav>
  )
}
