import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { loadGlossary, loadIndex } from '../data'
import { useAsync } from '../state/useAsync'
import { Spinner, ErrorState } from '../components/States'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { LanguageToggle } from '../components/Toggles'
import { useLang } from '../state/AppState'
import { scriptClass } from '../config'
import type { GlossaryTerm } from '../types'

function fold(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export default function GlossaryPage() {
  const { lang, t } = useLang()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const gloss = useAsync(() => loadGlossary(), [])
  const idx = useAsync(() => loadIndex(), [])

  useEffect(() => {
    const next: Record<string, string> = q ? { q } : {}
    setParams(next, { replace: true })
  }, [q, setParams])

  const terms = useMemo<GlossaryTerm[]>(() => {
    const list = gloss.data?.languages?.[lang]?.terms || []
    if (!q.trim()) return list
    const nq = fold(q)
    return list.filter(
      (term) =>
        fold(term.term).includes(nq) ||
        fold(term.definition).includes(nq) ||
        (term.scriptForm && term.scriptForm.includes(q))
    )
  }, [gloss.data, lang, q])

  if (gloss.loading) return <Spinner />
  if (gloss.error || !gloss.data) return <ErrorState detail={gloss.error?.message} />

  const sutraName = (id: string) => idx.data?.sutras[id]?.name_en || id
  const sc = scriptClass(lang)
  const allCount = gloss.data.languages?.[lang]?.terms?.length || 0

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: t('crumb.home'), to: '/' }, { label: t('crumb.glossary') }]} />

      <section className="border-b border-line bg-gradient-to-b from-surface to-ground">
        <div className="container-page py-12">
          <p className="label-eyebrow">{t('glossary.eyebrow')}</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">{t('glossary.title')}</h1>
          <p className="mt-3 max-w-2xl text-muted">
            {t('glossary.intro')}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:max-w-md">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" strokeLinecap="round" />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('glossary.searchPlaceholder')}
                aria-label={t('glossary.searchAria')}
                className="w-full rounded-full border border-line bg-surface py-2.5 pl-10 pr-4 outline-none focus-visible:ring-2"
              />
            </div>
            <LanguageToggle />
          </div>
          <p className="mt-3 text-sm text-muted">
            {q
              ? `${t('glossary.countFiltered', { n: terms.length, total: allCount })} ${t('glossary.terms')}`
              : t('glossary.count', { n: allCount })}
          </p>
        </div>
      </section>

      <section className="container-page py-10">
        {terms.length === 0 ? (
          <p className="text-muted">{t('glossary.noMatch', { q })}</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {terms.map((term) => (
              <li key={term.term} className="card p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-serif text-xl text-maroon">{term.term}</h2>
                  {term.scriptForm && <span className="text-lg text-muted x-guj">{term.scriptForm}</span>}
                </div>
                <p className={`mt-2 leading-relaxed text-ink/85 ${sc}`}>{term.definition}</p>
                {term.sutras && term.sutras.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {term.sutras.map((sid) => (
                      <Link key={sid} to={`/s/${sid}`} className="chip hover:border-saffron hover:text-maroon">
                        {sutraName(sid)}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
