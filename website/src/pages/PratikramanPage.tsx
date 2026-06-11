import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { loadIndex, loadVidhi } from '../data'
import { useAsync } from '../state/useAsync'
import { useLang } from '../state/AppState'
import { Spinner, ErrorState } from '../components/States'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { AvashyakaLegend } from '../components/Avashyaka'
import { SutraStepCard, VidhiCard } from '../components/SequenceSteps'
import { formatPages } from '../utils'
import { composeSequence, type Provenance } from '../sequence'
import {
  locCovers,
  locFrequency,
  locKausagga,
  locPratikramanName,
  locPratikramanNote,
  locPratikramanShort,
} from '../contentI18n'
import type { Lang, Pratikraman, SiteIndex } from '../types'

/** A rite's display name in the active language (native for Gujarati, else localized English). */
const localName = (p: Pratikraman, lang: Lang) =>
  lang === 'gujarati' ? p.name_native : locPratikramanName(lang, p.id, p.name_en)

export default function PratikramanPage() {
  const { pratikramanId } = useParams()
  const { t, lang } = useLang()
  const { data: index, loading, error } = useAsync(() => loadIndex(), [])

  if (loading) return <Spinner />
  if (error || !index) return <ErrorState detail={error?.message} />

  const p = index.pratikramans.find((x) => x.id === pratikramanId)
  if (!p)
    return (
      <ErrorState title={t('prati.notFound.title')} detail={t('prati.notFound.detail', { id: pratikramanId ?? '' })} />
    )

  // The base rite this one builds on, whether by sharedFrom (Rāi/Pākṣika) or basedOn (Cāumāsī/Sāṁvatsarī).
  const baseId = p.basedOn || p.sharedFrom?.pratikraman
  const base = baseId ? index.pratikramans.find((x) => x.id === baseId) : undefined

  return (
    <div className="animate-fade-in">
      <Breadcrumbs
        items={[
          { label: t('crumb.home'), to: '/' },
          { label: t('crumb.pratikramans') },
          { label: localName(p, lang) },
        ]}
      />

      {/* header band */}
      <section className="border-b border-line bg-gradient-to-b from-surface to-ground">
        <div className="container-page py-12">
          <p className="label-eyebrow">
            {t('prati.number', { order: p.order })}
            {p.isBase ? ` · ${t('prati.baseRite')}` : ''}
          </p>
          <h1 className="mt-2 text-4xl x-guj sm:text-5xl">{p.name_native}</h1>
          <p className="mt-2 text-xl text-muted">
            <span className="font-serif italic text-ink">{p.name_translit}</span> ·{' '}
            {locPratikramanName(lang, p.id, p.name_en)}
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact term={t('prati.frequency')} val={locFrequency(lang, p.id, p.frequency)} />
            <Fact term={t('prati.covers')} val={locCovers(lang, p.id, p.covers)} />
            {p.kausagga && <Fact term={t('prati.kausagga')} val={locKausagga(lang, p.kausagga)} />}
            {p.overrides?.kausagga && <Fact term={t('prati.kausagga')} val={locKausagga(lang, p.overrides.kausagga)} />}
            {formatPages(p.bookPages) && <Fact term={t('prati.book')} val={formatPages(p.bookPages)!} />}
          </dl>

          {p.note && (
            <p className="mt-6 max-w-3xl rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed text-ink/80">
              {locPratikramanNote(lang, p.id, p.note)}
            </p>
          )}

          <div className="mt-6">
            <p className="mb-2 label-eyebrow">{t('prati.sixAvashyakas')}</p>
            <AvashyakaLegend avashyakas={index.avashyakas} />
          </div>
        </div>
      </section>

      {/* body — the complete recitation, composed in full for every rite */}
      <section className="container-page py-12">
        <SequenceView p={p} index={index} base={base} />
      </section>
    </div>
  )
}

function Fact({ term, val }: { term: string; val: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <dt className="text-xs uppercase tracking-wide text-muted">{term}</dt>
      <dd className="mt-1 text-sm font-medium text-ink/90">{val}</dd>
    </div>
  )
}

function SequenceView({ p, index, base }: { p: Pratikraman; index: SiteIndex; base?: Pratikraman }) {
  const { lang, t } = useLang()
  // Vidhi/ādeśa native text + translations are lazy-loaded once per rite view.
  const { data: vidhi } = useAsync(() => loadVidhi(), [])
  const composed = useMemo(() => composeSequence(p, index.pratikramans), [p, index.pratikramans])

  const riteName = locPratikramanShort(lang, p.id, p.name_en)
  const baseName = base ? locPratikramanShort(lang, base.id, base.name_en) : p.basedOn || ''

  return (
    <div className="mx-auto max-w-3xl">
      {/* By-reference rite (Cāumāsī/Sāṁvatsarī): the substitution + kāyotsarga change. */}
      {composed.kind === 'reference' && composed.overrides && (
        <OverrideBanner p={p} base={base} overrides={composed.overrides} />
      )}

      {/* Legend explaining the full-sequence composition + the highlight. */}
      {composed.kind !== 'base' && base && (
        <div className="mb-6 rounded-xl border border-line bg-surface p-4 text-sm">
          <p className="leading-relaxed text-ink/80">
            {composed.kind === 'reference'
              ? t('prati.legend.reference', { base: baseName })
              : t('prati.legend.derived', { rite: riteName, base: baseName })}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-saffron/50 bg-saffron/10 px-2.5 py-1 text-xs font-medium text-saffron">
              <span className="h-2 w-2 rounded-full bg-saffron" aria-hidden="true" />
              {t('prov.specific', { rite: riteName })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
              <span className="h-2 w-2 rounded-full bg-muted" aria-hidden="true" />
              {composed.kind === 'reference' ? t('prov.inherited', { base: baseName }) : t('prov.shared')}
            </span>
          </div>
        </div>
      )}

      <ol className="relative space-y-4 border-l border-line pl-6">
        {composed.steps.map(({ step, provenance, from }, i) => {
          const accent =
            provenance === 'specific'
              ? 'border-saffron bg-surface'
              : provenance === 'inherited'
                ? 'border-indigo/50 bg-surface-2'
                : provenance === 'shared'
                  ? 'border-line bg-surface-2'
                  : step.type === 'sutra'
                    ? 'border-saffron bg-surface'
                    : 'border-line bg-surface-2'
          return (
            <li key={i} className="relative">
              <span
                className={`absolute -left-[1.65rem] top-4 h-3 w-3 rounded-full border-2 ${accent}`}
                aria-hidden="true"
              />
              <ProvenanceWrap provenance={provenance} from={from} riteName={riteName} baseName={baseName}>
                {step.type === 'vidhi' ? (
                  <VidhiCard
                    step={step}
                    avashyakas={index.avashyakas}
                    data={vidhi?.steps?.[step.id]}
                    index={index}
                  />
                ) : (
                  <SutraStepCard step={step} index={index} avashyakas={index.avashyakas} />
                )}
              </ProvenanceWrap>
            </li>
          )
        })}
      </ol>

      <p className="mt-6 text-center text-sm text-muted">
        {t('prati.counts', { sutras: composed.counts.sutras, vidhis: composed.counts.vidhis })}
      </p>
    </div>
  )
}

/** Wraps a step card with a provenance badge + subtle accent for the delta. */
function ProvenanceWrap({
  provenance,
  from,
  riteName,
  baseName,
  children,
}: {
  provenance: Provenance
  from?: string
  riteName: string
  baseName: string
  children: React.ReactNode
}) {
  const { t } = useLang()
  if (provenance === 'base') return <>{children}</>

  const badge =
    provenance === 'specific' ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-saffron/50 bg-saffron/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-saffron">
        {t('prov.specific', { rite: riteName })}
      </span>
    ) : provenance === 'inherited' ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-indigo/40 bg-indigo/10 px-2 py-0.5 text-[0.65rem] font-medium text-indigo">
        {t('prov.inherited', { base: baseName })}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[0.65rem] font-medium text-muted">
        {t('prov.shared')}
        {from ? ` · ${baseName}` : ''}
      </span>
    )

  return (
    <div className={provenance === 'specific' ? 'rounded-2xl ring-1 ring-saffron/30' : ''}>
      <div className="mb-1.5">{badge}</div>
      {children}
    </div>
  )
}

/** Compact banner for a by-reference rite: the word-substitution + kāyotsarga change. */
function OverrideBanner({
  p,
  base,
  overrides,
}: {
  p: Pratikraman
  base?: Pratikraman
  overrides: NonNullable<Pratikraman['overrides']>
}) {
  const { lang, t } = useLang()
  const baseName = base ? locPratikramanName(lang, base.id, base.name_en) : p.basedOn || ''
  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-maroon/30 bg-gradient-to-r from-maroon/5 to-saffron/5">
      <div className="px-5 py-4">
        <h2 className="text-lg">{t('prati.derived.title', { base: baseName })}</h2>
        <p className="mt-1 text-sm text-muted">
          {t('prati.derived.subtitle', { name: locPratikramanName(lang, p.id, p.name_en) })}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {overrides.wordSubstitution && (
            <div>
              <p className="label-eyebrow mb-2">{t('prati.derived.wordSub')}</p>
              <div className="flex items-center gap-2 text-base">
                <span className="rounded-lg border border-line bg-surface px-2.5 py-1 x-guj">
                  {overrides.wordSubstitution.from}
                </span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-saffron" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="rounded-lg border border-saffron/50 bg-saffron/10 px-2.5 py-1 x-guj">
                  {overrides.wordSubstitution.to}
                </span>
              </div>
            </div>
          )}
          {overrides.kausagga && (
            <div>
              <p className="label-eyebrow mb-2">{t('prati.derived.kausagga')}</p>
              <p className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium">
                {locKausagga(lang, overrides.kausagga)}
              </p>
            </div>
          )}
        </div>
        {p.note && (
          <p className="mt-4 text-sm italic leading-relaxed text-muted">{locPratikramanNote(lang, p.id, p.note)}</p>
        )}
      </div>
    </div>
  )
}
