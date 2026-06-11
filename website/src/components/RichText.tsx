import { Fragment, type ReactNode } from 'react'

// Minimal inline formatter for localized prose strings: **bold**, *italic*, `code`.
// Keeps the design's emphasis working across all three languages without pulling in
// a full markdown renderer for short strings.
const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g

function parse(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  let m: RegExpExecArray | null
  TOKEN.lastIndex = 0
  while ((m = TOKEN.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) out.push(<strong key={i++}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('`'))
      out.push(
        <code key={i++} className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.85em]">
          {tok.slice(1, -1)}
        </code>
      )
    else out.push(<em key={i++}>{tok.slice(1, -1)}</em>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function RichText({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{parse(text).map((n, i) => <Fragment key={i}>{n}</Fragment>)}</span>
}
