import { useMemo } from 'react'
import { Tooltip } from './Tooltip'
import type { PrefaceGlossaryTerm } from '../types'

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Render text with glossary terms underlined + tooltipped.
 * Matching is whole-word, case-insensitive, longest-term-first. Each distinct
 * term is linked at most once per text block to avoid visual noise.
 */
export function GlossaryText({
  text,
  terms,
  className = '',
}: {
  text: string
  terms: PrefaceGlossaryTerm[]
  className?: string
}) {
  const { regex, lookup } = useMemo(() => {
    const map = new Map<string, PrefaceGlossaryTerm>()
    const alts: string[] = []
    for (const t of terms || []) {
      // A term entry may itself contain slash-separated variants.
      for (const variant of t.term.split('/').map((x) => x.trim())) {
        if (variant.length < 3) continue
        const key = variant.toLowerCase()
        if (!map.has(key)) {
          map.set(key, t)
          alts.push(escapeRegExp(variant))
        }
      }
    }
    if (!alts.length) return { regex: null, lookup: map }
    alts.sort((a, b) => b.length - a.length)
    return {
      regex: new RegExp(`(${alts.join('|')})`, 'giu'),
      lookup: map,
    }
  }, [terms])

  if (!regex || !text) return <span className={className}>{text}</span>

  const seen = new Set<string>()
  const parts = text.split(regex)
  return (
    <span className={className}>
      {parts.map((part, i) => {
        const key = part?.toLowerCase?.()
        const entry = key ? lookup.get(key) : undefined
        if (entry && !seen.has(key)) {
          seen.add(key)
          return (
            <Tooltip
              key={i}
              content={
                <span>
                  <strong>{entry.term}</strong>
                  {entry.scriptForm ? <span className="x-guj"> · {entry.scriptForm}</span> : null}
                  <br />
                  {entry.definition}
                </span>
              }
            >
              {part}
            </Tooltip>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}
