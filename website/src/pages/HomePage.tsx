import { Link } from 'react-router-dom'
import { loadIndex } from '../data'
import { useAsync } from '../state/useAsync'
import { useLang } from '../state/AppState'
import { Spinner, ErrorState } from '../components/States'
import { RichText } from '../components/RichText'
import { DandaDivider, MandalaGlyph, LotusMark } from '../components/Motifs'
import { AvashyakaLegend } from '../components/Avashyaka'
import { locCovers, locFrequency, locPratikramanName, locPratikramanShort } from '../contentI18n'
import type { Pratikraman } from '../types'

const FREQ_ICON = (id: string) => {
  switch (id) {
    case 'devasi': return '🌇'
    case 'rai': return '🌅'
    case 'pakshik': return '🌓'
    case 'chaumasi': return '🍂'
    case 'samvatsari': return '🪔'
    default: return '◈'
  }
}

export default function HomePage() {
  const { t } = useLang()
  const { data: index, loading, error } = useAsync(() => loadIndex(), [])
  if (loading) return <Spinner label={t('common.preparing')} />
  if (error || !index) return <ErrorState detail={error?.message} />

  const pratikramans = [...index.pratikramans].sort((a, b) => a.order - b.order)

  return (
    <div className="animate-fade-in">
      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-line">
        <MandalaGlyph className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] text-gold/10" />
        <MandalaGlyph className="pointer-events-none absolute -bottom-40 -left-32 h-[34rem] w-[34rem] text-saffron/5" />
        <div className="container-page relative py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="label-eyebrow">{t('home.hero.eyebrow')}</p>
            <h1 className="mt-4 text-balance font-serif text-4xl leading-tight sm:text-6xl">
              {t('home.hero.title')}
            </h1>
            <p className="mt-3 text-xl text-maroon x-guj">પંચ પ્રતિક્રમણ સૂત્ર</p>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-ink/80">
              <RichText text={t('home.hero.subtitle')} />
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to="/p/devasi" className="btn btn-primary px-6 py-3 text-base">
                {t('home.hero.begin')}
              </Link>
              <a
                href="#what"
                className="btn px-6 py-3 text-base"
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById('what')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                {t('home.hero.whatIs')}
              </a>
            </div>
            <dl className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-4 text-center">
              {[
                ['5', t('home.stats.pratikramans')],
                ['6', t('home.stats.avashyakas')],
                [`${index.stats.sutraCount}`, t('home.stats.sutras')],
              ].map(([n, l]) => (
                <div key={l} className="rounded-xl border border-line bg-surface/70 py-4">
                  <dt className="font-serif text-3xl text-saffron">{n}</dt>
                  <dd className="mt-1 text-xs uppercase tracking-wide text-muted">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ------------------------------------------- what is pratikramana */}
      <section id="what" className="container-page scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-reading">
          <p className="label-eyebrow">{t('home.what.eyebrow')}</p>
          <h2 className="mt-2 text-3xl sm:text-4xl">{t('home.what.title')}</h2>
          <div className="prose-sacred mt-6 text-lg">
            <p>
              <RichText text={t('home.what.body')} />
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="card p-6">
              <h3 className="text-xl">{t('home.doctrinal.title')}</h3>
              <p className="mt-2 leading-relaxed text-ink/80">
                <RichText text={t('home.doctrinal.body')} />
              </p>
            </div>
            <div className="card p-6">
              <h3 className="text-xl">{t('home.practical.title')}</h3>
              <p className="mt-2 leading-relaxed text-ink/80">
                <RichText text={t('home.practical.body')} />
              </p>
            </div>
          </div>

          <div className="mt-8">
            <p className="mb-3 label-eyebrow">{t('home.avashyakaLegend')}</p>
            <AvashyakaLegend avashyakas={index.avashyakas} />
          </div>
        </div>
      </section>

      <DandaDivider />

      {/* --------------------------------------------- five pratikramans */}
      <section className="container-page py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="label-eyebrow">{t('home.five.eyebrow')}</p>
          <h2 className="mt-2 text-3xl sm:text-4xl">{t('home.five.title')}</h2>
          <p className="mt-4 text-muted">
            <RichText text={t('home.five.body')} />
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {pratikramans.map((p, i) => (
            <PratikramanCard key={p.id} p={p} highlight={i === 0} />
          ))}
          <Link
            to="/about"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-surface-2/50 p-6 text-center transition hover:border-saffron"
          >
            <LotusMark className="h-10 w-10 text-saffron" />
            <span className="font-medium">{t('home.tradition.title')}</span>
            <span className="text-sm text-muted">{t('home.tradition.cta')}</span>
          </Link>
        </div>
      </section>

      {/* -------------------------------------------- how to read panel */}
      <section className="container-page pb-20">
        <div className="mx-auto max-w-reading rounded-2xl border border-line bg-gradient-to-br from-surface to-surface-2 p-8">
          <h2 className="text-2xl">{t('home.howToRead.title')}</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-lg text-maroon">{t('home.howToRead.newcomer.title')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/80">
                {t('home.howToRead.newcomer.body')}
              </p>
            </div>
            <div>
              <h3 className="text-lg text-maroon">{t('home.howToRead.practitioner.title')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/80">
                {t('home.howToRead.practitioner.body')}
              </p>
            </div>
          </div>
          <p className="mt-6 text-xs text-muted">
            {t('home.source.note', { book: index.sourceBook || t('home.source.fallback') })}
          </p>
        </div>
      </section>
    </div>
  )
}

function PratikramanCard({ p, highlight }: { p: Pratikraman; highlight?: boolean }) {
  const { lang, t } = useLang()
  return (
    <Link
      to={`/p/${p.id}`}
      className={`group relative flex flex-col rounded-2xl border bg-surface p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-lg ${
        highlight ? 'border-saffron/60' : 'border-line hover:border-saffron'
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-3xl" aria-hidden="true">{FREQ_ICON(p.id)}</span>
        <span className="chip">
          {p.isBase
            ? t('home.card.base')
            : p.basedOn
              ? `= ${locPratikramanShort(lang, p.basedOn, p.basedOn)}`
              : `#${p.order}`}
        </span>
      </div>
      <h3 className="mt-4 text-xl x-guj">{p.name_native}</h3>
      <p className="text-sm text-muted">
        <span className="font-serif italic">{p.name_translit}</span> · {locPratikramanName(lang, p.id, p.name_en)}
      </p>
      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted">{t('home.card.frequency')}</dt>
          <dd className="text-ink/85">{locFrequency(lang, p.id, p.frequency)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted">{t('home.card.covers')}</dt>
          <dd className="text-ink/85">{locCovers(lang, p.id, p.covers)}</dd>
        </div>
      </dl>
      <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-maroon">
        {t('home.card.open')}
        <svg viewBox="0 0 24 24" className="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  )
}
