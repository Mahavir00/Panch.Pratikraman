import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadSearchIndex } from '../data'
import { useAsync } from '../state/useAsync'
import { useLang } from '../state/AppState'
import type { SearchRecord } from '../types'
import { shlokaAnchor } from '../utils'

function normalize(s: string) {
  // Fold diacritics so "sangha" matches "saṅgha".
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function scoreRecord(rec: SearchRecord, q: string): number {
  const hay = normalize(`${rec.label} ${rec.sub || ''} ${rec.native || ''} ${rec.text}`)
  const nq = normalize(q)
  if (!nq) return 0
  let score = 0
  if (normalize(rec.label).startsWith(nq)) score += 50
  if (hay.includes(nq)) score += 20
  // token coverage
  const toks = nq.split(/\s+/).filter(Boolean)
  for (const t of toks) if (hay.includes(t)) score += 4
  // native-script direct hit
  if (rec.native && rec.native.includes(q)) score += 30
  return score
}

const TYPE_KEY: Record<SearchRecord['type'], string> = {
  sutra: 'search.type.sutra',
  shloka: 'search.type.shloka',
  glossary: 'search.type.glossary',
  vidhi: 'search.type.vidhi',
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { t } = useLang()
  const { data } = useAsync(() => loadSearchIndex(), [])

  const results = useMemo(() => {
    if (!data || q.trim().length < 2) return [] as SearchRecord[]
    return data.records
      .map((r) => ({ r, s: scoreRecord(r, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 24)
      .map((x) => x.r)
  }, [data, q])

  useEffect(() => setActive(0), [q])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
    else setQ('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((a) => Math.min(a + 1, results.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((a) => Math.max(a - 1, 0))
      }
      if (e.key === 'Enter' && results[active]) {
        go(results[active])
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, results, active])

  if (!open) return null

  const hrefFor = (r: SearchRecord) => {
    if (r.type === 'sutra') return `/s/${r.sutraId}`
    if (r.type === 'shloka') return `/s/${r.sutraId}#${shlokaAnchor(r.id)}`
    if (r.type === 'vidhi') return `/p/${r.pratikraman}`
    return `/glossary?q=${encodeURIComponent(r.label)}`
  }
  const go = (r: SearchRecord) => {
    onClose()
    navigate(hrefFor(r))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('search.button')}
      onClick={onClose}
    >
      <div className="w-full max-w-xl card overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent py-3.5 text-base outline-none placeholder:text-muted"
            aria-label={t('search.button')}
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[0.65rem] text-muted sm:inline">Esc</kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {q.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">
              {t('search.hint')}
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">{t('search.noMatch', { q })}</p>
          ) : (
            <ul>
              {results.map((r, i) => (
                <li key={r.type + r.id}>
                  <Link
                    to={hrefFor(r)}
                    onClick={() => onClose()}
                    onMouseEnter={() => setActive(i)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                      i === active ? 'bg-surface-2' : ''
                    }`}
                  >
                    <span className="chip shrink-0">{t(TYPE_KEY[r.type])}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.label}</span>
                      {r.native && (
                        <span className="block truncate text-sm text-muted x-guj">{r.native}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
