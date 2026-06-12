import { loadIndex, loadIntroMarkdown } from '../data'
import { useAsync } from '../state/useAsync'
import { useLang } from '../state/AppState'
import { Spinner } from '../components/States'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { MarkdownView } from '../components/MarkdownView'
import { AhimsaMark, DandaDivider } from '../components/Motifs'
import { asset } from '../config'

export default function AboutPage() {
  const { lang, t } = useLang()
  const idx = useAsync(() => loadIndex(), [])
  const md = useAsync(() => loadIntroMarkdown().catch(() => ''), [])

  const index = idx.data
  const pdf = index?.pdfs?.[0]

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: t('crumb.home'), to: '/' }, { label: t('crumb.about') }]} />

      <section className="border-b border-line bg-gradient-to-b from-surface to-ground">
        <div className="container-page flex flex-col items-center py-16 text-center">
          <AhimsaMark className="h-16 w-16 text-maroon" />
          <h1 className="mt-5 text-4xl sm:text-5xl">{t('about.hero.title')}</h1>
          <p className="mt-4 max-w-2xl text-pretty text-lg text-ink/80">{t('about.hero.body')}</p>
          {index?.traditionAliases && index.traditionAliases.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {index.traditionAliases.map((a) => (
                <span key={a} className="chip">{a}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="container-page py-12">
        <div className="mx-auto grid max-w-page gap-10 lg:grid-cols-[1fr_18rem]">
          <div className="min-w-0 max-w-reading">
            {md.loading ? (
              <Spinner label={t('about.loadingKb')} />
            ) : md.data ? (
              <>
                <p className="mb-5 inline-flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-muted">
                  <span aria-hidden="true">🌐</span> {t('about.kbLangNote')}
                </p>
                <MarkdownView>{md.data}</MarkdownView>
              </>
            ) : (
              <FallbackAbout />
            )}
          </div>

          <aside className="space-y-6">
            <div className="card p-5">
              <h2 className="text-lg">{t('about.sourceBook.title')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {lang === 'english' ? index?.sourceBook || t('footer.sourceFallback') : t('footer.sourceFallback')}
              </p>
            </div>

            {index && (
              <div className="card p-5">
                <h2 className="text-lg">{t('about.corpus.title')}</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <Stat term={t('about.corpus.sutras')} val={index.stats.sutraCount} />
                  <Stat term={t('about.corpus.verses')} val={index.stats.shlokaCount} />
                  <Stat term={t('about.corpus.prefaces')} val={index.stats.prefaceCount} />
                  <Stat term={t('about.corpus.translations')} val={index.stats.translationCount} />
                </dl>
                <p className="mt-3 text-xs text-muted">{t('about.corpus.note')}</p>
              </div>
            )}

            <div className="card p-5">
              <h2 className="text-lg">{t('about.method.title')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t('about.method.body')}</p>
            </div>

            {pdf && (
              <a className="btn btn-primary w-full" href={asset(`data/${pdf}`)} download>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('about.downloadPdf')}
              </a>
            )}
          </aside>
        </div>
        <DandaDivider className="mt-14" />
        <p className="mx-auto mt-8 max-w-reading text-center text-sm text-muted">
          {t('about.footer.made')}
        </p>
      </section>
    </div>
  )
}

function Stat({ term, val }: { term: string; val: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{term}</dt>
      <dd className="font-serif text-lg text-saffron">{val}</dd>
    </div>
  )
}

function FallbackAbout() {
  return (
    <div className="prose-sacred max-w-none">
      <p>
        The Achhalgach (also Anchalgachchha, Aanchalagaccha, or by its self-designation{' '}
        <em>Vidhipakṣa Gaccha</em>) is a Śvetāmbara Mūrtipūjaka branch of Jainism. Its Pañca
        Pratikramaṇa is the five-fold rite of reflection and renewal — daily, fortnightly, seasonal,
        and annual.
      </p>
      <p>
        This edition is grounded in the tradition’s authoritative printed edition. Re-run the
        data-sync to load the full tradition knowledge base here.
      </p>
    </div>
  )
}
