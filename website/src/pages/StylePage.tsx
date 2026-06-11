import { Breadcrumbs } from '../components/Breadcrumbs'
import { DandaDivider, LotusMark, MandalaGlyph, CornerFlourish, AhimsaMark } from '../components/Motifs'
import { Disclosure } from '../components/Disclosure'
import { CopyButton } from '../components/CopyButton'
import { ProgressMeter } from '../components/Progress'
import { Tooltip } from '../components/Tooltip'
import { LanguageToggle, ThemeToggle } from '../components/Toggles'
import { useLang } from '../state/AppState'
import type { Availability } from '../types'

const SWATCHES: [string, string][] = [
  ['Maroon', 'bg-maroon'],
  ['Saffron', 'bg-saffron'],
  ['Gold', 'bg-gold'],
  ['Green', 'bg-jgreen'],
  ['Indigo', 'bg-indigo'],
  ['Ground', 'bg-ground border border-line'],
  ['Surface', 'bg-surface border border-line'],
  ['Surface 2', 'bg-surface-2 border border-line'],
]

const demoAvail: Availability = {
  hasCanonical: true,
  needsVerseExtraction: false,
  shlokaCount: 4,
  prefaces: { english: true, gujarati: true, hindi: false },
  translatedShlokas: { english: 4, gujarati: 2, hindi: 0 },
  anyTranslated: true,
}

export default function StylePage() {
  const { t } = useLang()
  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: t('crumb.home'), to: '/' }, { label: t('crumb.designSystem') }]} />

      <section className="container-page py-12">
        <p className="label-eyebrow">{t('style.eyebrow')}</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">{t('style.title')}</h1>
        <p className="mt-3 max-w-2xl text-muted">
          {t('style.intro')}
        </p>
      </section>

      <Section title={t('style.section.colors')}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="overflow-hidden rounded-xl border border-line">
              <div className={`h-20 ${cls}`} />
              <div className="bg-surface px-3 py-2 text-sm">{name}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('style.section.typography')}>
        <div className="space-y-4">
          <p className="font-serif text-5xl">Pañca Pratikramaṇa</p>
          <p className="font-serif text-3xl">A reverent serif for display</p>
          <p className="text-lg">Inter — a clean sans for the user interface and metadata.</p>
          <p className="text-2xl x-guj" lang="gu">જયઇ જગજીવજોણી-વિયાણઓ — Noto Serif Gujarati · જ્ઞ ક્ષ શ્ર</p>
          <p className="text-2xl x-deva" lang="hi">जयइ जगजीवजोणी-वियाणओ — Noto Serif Devanagari · ज्ञ क्ष श्र</p>
        </div>
      </Section>

      <Section title={t('style.section.motifs')}>
        <div className="flex flex-wrap items-center gap-10 text-maroon">
          <figure className="text-center"><LotusMark className="h-16 w-16" /><figcaption className="mt-2 text-xs text-muted">Lotus mark</figcaption></figure>
          <figure className="text-center"><AhimsaMark className="h-16 w-16" /><figcaption className="mt-2 text-xs text-muted">Ahiṁsā</figcaption></figure>
          <figure className="text-center text-gold"><MandalaGlyph className="h-20 w-20" /><figcaption className="mt-2 text-xs text-muted">Mandala</figcaption></figure>
          <figure className="text-center text-saffron"><CornerFlourish className="h-12 w-12" /><figcaption className="mt-2 text-xs text-muted">Flourish</figcaption></figure>
        </div>
        <DandaDivider className="mt-8" />
      </Section>

      <Section title={t('style.section.controls')}>
        <div className="flex flex-wrap items-center gap-4">
          <button className="btn btn-primary">Primary button</button>
          <button className="btn">Secondary button</button>
          <CopyButton text="namo arihantāṇaṁ" />
          <span className="chip">A chip</span>
          <LanguageToggle />
          <ThemeToggle />
          <ProgressMeter availability={demoAvail} />
          <Tooltip content="A definition appears here on hover or tap.">glossary term</Tooltip>
        </div>
      </Section>

      <Section title={t('style.section.disclosure')}>
        <Disclosure title={t('shloka.wordByWord')} count={3} defaultOpen>
          <p className="text-sm text-muted">Collapsed-by-default scholarly layers expand on demand.</p>
        </Disclosure>
      </Section>

      <Section title={t('style.section.verse')}>
        <div className="card p-6">
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-gold/50 bg-gold/10 px-2 font-serif text-sm font-semibold text-gold">1</span>
          <p className="mt-3 text-2xl leading-relaxed x-guj" lang="gu">
            જયઇ જગજીવજોણી-વિયાણઓ, જગગુરુ જગાણંદો; જગનાહો જગબંધુ, જયઇ જગપ્પિયામહો ભયવં.
          </p>
          <div className="mt-4 rounded-xl border border-saffron/30 bg-saffron/5 p-4">
            <p className="label-eyebrow mb-1.5">{t('shloka.toReciteIast')}</p>
            <p className="font-serif text-lg italic">jayai jaga-jīva-joṇī-viyāṇao jaga-guru jagāṇaṁdo…</p>
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="container-page border-t border-line py-12">
      <h2 className="mb-6 text-2xl">{title}</h2>
      {children}
    </section>
  )
}
