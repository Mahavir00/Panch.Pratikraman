import { useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { loadIndex, loadSutra } from '../data'
import { useAsync } from '../state/useAsync'
import { Spinner, ErrorState, EmptyHint } from '../components/States'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { ShlokaCard } from '../components/ShlokaCard'
import { Disclosure } from '../components/Disclosure'
import { BookmarkButton } from '../components/BookmarkButton'
import { LanguageToggle } from '../components/Toggles'
import { GlossaryText } from '../components/GlossaryText'
import { InProgressNote } from '../components/Progress'
import { DandaDivider } from '../components/Motifs'
import { SourceList } from '../components/SourceList'
import { useLang, useLibrary } from '../state/AppState'
import { useEffect } from 'react'
import { formatPages, isShared } from '../utils'
import { scriptClass } from '../config'
import { locKind, locPratikramanShort, locSutraName, locSutraRole } from '../contentI18n'
import type { Preface, SutraBundle } from '../types'
import { loadGlossary } from '../data'

export default function SutraPage() {
  const { sutraId = '' } = useParams()
  const { lang, t } = useLang()
  const { pushRecent } = useLibrary()
  const { hash } = useLocation()

  const idx = useAsync(() => loadIndex(), [])
  const bundle = useAsync(() => loadSutra(sutraId), [sutraId])
  const gloss = useAsync(() => loadGlossary(), [])

  useEffect(() => {
    if (bundle.data) {
      pushRecent({
        kind: 'sutra',
        id: bundle.data.sutraId,
        sutraId: bundle.data.sutraId,
        label: bundle.data.name_en,
        sub: bundle.data.name_translit,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle.data?.sutraId])

  // Deep-link: once verses are rendered, scroll to the inner-hash target (#NN).
  useEffect(() => {
    if (!bundle.data || !hash) return
    const id = hash.replace(/^#/, '')
    const el = document.getElementById(id)
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle.data?.sutraId, hash])

  if (bundle.loading || idx.loading) return <Spinner />
  if (bundle.error || !bundle.data)
    return <ErrorState title={t('sutra.notFound.title')} detail={bundle.error?.message} />

  const s = bundle.data
  const preface = s.prefaces[lang]
  const posLabels = gloss.data?.posLabels || {}
  const glossaryTerms = preface?.glossary || []

  return (
    <div className="animate-fade-in">
      <Breadcrumbs
        items={[
          { label: t('crumb.home'), to: '/' },
          { label: t('crumb.sutras') },
          { label: lang === 'gujarati' ? s.name_native : s.name_en },
        ]}
      />

      <SutraHeader s={s} idx={idx.data} />

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_15rem]">
        <div className="min-w-0 max-w-3xl">
          {/* preface */}
          {preface ? (
            <PrefaceBlock preface={preface} lang={lang} />
          ) : (
            <div className="mb-8">
              <InProgressNote>{t('sutra.prefacePending')}</InProgressNote>
            </div>
          )}

          {/* shlokas */}
          <DandaDivider className="my-10" />

          {s.needsVerseExtraction || s.shlokas.length === 0 ? (
            <EmptyHint>{t('sutra.versePending')}</EmptyHint>
          ) : (
            <div className="space-y-6">
              {s.shlokas.map((sh, i) => (
                <ShlokaCard
                  key={sh.shlokaId}
                  shloka={sh}
                  lang={lang}
                  posLabels={posLabels}
                  glossaryTerms={glossaryTerms}
                  index={i}
                />
              ))}
            </div>
          )}

          {preface?.sources && preface.sources.length > 0 && (
            <div className="mt-10">
              <Disclosure title={t('sutra.prefaceSources')} count={preface.sources.length}>
                <SourceList sources={preface.sources} />
              </Disclosure>
            </div>
          )}
        </div>

        {/* sticky verse mini-nav */}
        <VerseNav s={s} />
      </div>
    </div>
  )
}

function SutraHeader({ s, idx }: { s: SutraBundle; idx: import('../types').SiteIndex | null }) {
  const { lang, t } = useLang()
  const usedIn = s.usedIn || []
  return (
    <section className="border-b border-line bg-gradient-to-b from-surface to-ground print:bg-white">
      <div className="container-page py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="chip">{locKind(lang, s.kind)}</span>
              {typeof s.smaranNo === 'number' && <span className="chip">{t('sutra.smarana', { n: s.smaranNo })}</span>}
              {isShared(usedIn) && <span className="chip">{t('sutra.sharedAcross', { n: usedIn.length })}</span>}
            </div>
            <h1 className="text-4xl x-guj sm:text-5xl">{s.name_native}</h1>
            <p className="mt-2 text-xl text-muted">
              <span className="font-serif italic text-ink">{s.name_translit}</span> ·{' '}
              {locSutraName(lang, s.sutraId, s.name_en)}
            </p>
            {s.role && <p className="mt-3 max-w-2xl leading-relaxed text-ink/80">{locSutraRole(lang, s.sutraId, s.role)}</p>}
          </div>
          <div className="no-print flex shrink-0 flex-col items-end gap-3">
            <LanguageToggle />
            <div className="flex gap-2">
              <BookmarkButton
                mark={{ kind: 'sutra', id: s.sutraId, sutraId: s.sutraId, label: s.name_en, sub: s.name_translit }}
              />
              <button type="button" onClick={() => window.print()} className="btn px-2.5 py-1 text-xs" title={t('sutra.printTitle')}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 9V3h12v6M6 18H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-2M6 14h12v7H6z" strokeLinejoin="round" />
                </svg>
                {t('common.print')}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
          {typeof s.gathaCount === 'number' && <span>{t('sutra.gatha', { n: s.gathaCount })}</span>}
          {s.shlokas.length > 0 && <span>{t('sutra.versesPresent', { n: s.shlokas.length })}</span>}
          {formatPages(s.bookPages) && <span>{t('sutra.book', { pages: formatPages(s.bookPages)! })}</span>}
          {usedIn.length > 0 && idx && (
            <span className="flex flex-wrap items-center gap-1.5">
              {t('sutra.recitedIn')}
              {usedIn.map((pid) => {
                const pr = idx.pratikramans.find((x) => x.id === pid)
                return (
                  <Link key={pid} to={`/p/${pid}`} className="chip hover:border-saffron">
                    {locPratikramanShort(lang, pid, pr?.name_en?.split(' ')[0] || pid)}
                  </Link>
                )
              })}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

function PrefaceBlock({ preface, lang }: { preface: Preface; lang: import('../types').Lang }) {
  const { t } = useLang()
  const sc = scriptClass(lang)
  const terms = preface.glossary || []
  return (
    <div>
      <h2 className={`text-2xl ${sc}`}>{preface.title}</h2>
      {preface.summary && (
        <p className={`mt-4 text-lg leading-relaxed text-ink/90 ${sc}`}>
          <GlossaryText text={preface.summary} terms={terms} />
        </p>
      )}
      {preface.howToRead && (
        <div className="mt-5 rounded-xl border border-saffron/30 bg-saffron/5 p-4">
          <p className="label-eyebrow mb-1.5">{t('sutra.howToRead')}</p>
          <p className={`leading-relaxed text-ink/85 ${sc}`}>
            <GlossaryText text={preface.howToRead} terms={terms} />
          </p>
        </div>
      )}

      <div className="mt-5">
        <Disclosure title={t('sutra.about')} icon={<InfoIcon />}>
          <div className="space-y-5">
            <Field label={t('sutra.field.ritualPlacement')} value={preface.ritualPlacement} lang={lang} terms={terms} />
            <Field label={t('sutra.field.authorAndSource')} value={preface.authorAndSource} lang={lang} terms={terms} />
            <Field label={t('sutra.field.structure')} value={preface.structureArc} lang={lang} terms={terms} />
            <Field label={t('sutra.field.imagery')} value={preface.recurringImagery} lang={lang} terms={terms} />
            {preface.keyThemes && preface.keyThemes.length > 0 && (
              <div>
                <p className="label-eyebrow mb-2">{t('sutra.field.keyThemes')}</p>
                <div className="flex flex-wrap gap-2">
                  {preface.keyThemes.map((theme, i) => (
                    <span key={i} className={`chip ${sc}`}>{theme}</span>
                  ))}
                </div>
              </div>
            )}
            {preface.notes && <p className="text-sm italic text-muted">{preface.notes}</p>}
          </div>
        </Disclosure>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  lang,
  terms,
}: {
  label: string
  value?: string
  lang: import('../types').Lang
  terms: import('../types').PrefaceGlossaryTerm[]
}) {
  if (!value) return null
  return (
    <div>
      <p className="label-eyebrow mb-1.5">{label}</p>
      <p className={`leading-relaxed text-ink/85 ${scriptClass(lang)}`}>
        <GlossaryText text={value} terms={terms} />
      </p>
    </div>
  )
}

function VerseNav({ s }: { s: SutraBundle }) {
  const { t } = useLang()
  const verses = useMemo(() => s.shlokas, [s])
  if (verses.length === 0) return <div className="hidden lg:block" />
  return (
    <aside className="no-print hidden lg:block">
      <div className="sticky top-20">
        <p className="label-eyebrow mb-3">{t('sutra.verses')}</p>
        <div className="flex flex-wrap gap-1.5">
          {verses.map((v) => (
            <Link
              key={v.shlokaId}
              to={{ hash: `#${v.shlokaId.split('/').pop()}` }}
              className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-line bg-surface px-2 text-sm font-medium text-ink/80 transition hover:border-saffron hover:text-maroon"
            >
              {v.printedNumber}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
    </svg>
  )
}
