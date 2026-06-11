import type { Availability, Lang } from '../types'
import { LANG_META, LANG_ORDER } from '../config'
import { useLang } from '../state/AppState'

/** Small three-language completion meter for a sutra. */
export function ProgressMeter({
  availability,
  className = '',
}: {
  availability: Availability
  className?: string
}) {
  const { t } = useLang()
  if (availability.needsVerseExtraction || availability.shlokaCount === 0) {
    return <span className={`chip ${className}`}>{t('progress.textPending')}</span>
  }
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={t('progress.byLang')}>
      {LANG_ORDER.map((l: Lang) => {
        const done = availability.translatedShlokas[l]
        const total = availability.shlokaCount
        const pct = total ? Math.round((done / total) * 100) : 0
        const full = pct >= 100
        return (
          <span
            key={l}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${
              full
                ? 'border-jgreen/40 bg-jgreen/10 text-jgreen'
                : pct > 0
                  ? 'border-saffron/40 bg-saffron/10 text-saffron'
                  : 'border-line bg-surface-2 text-muted'
            }`}
          >
            <span className={l === 'gujarati' ? 'x-guj' : l === 'hindi' ? 'x-deva' : ''}>
              {LANG_META[l].short}
            </span>
            {full ? '✓' : `${pct}%`}
          </span>
        )
      })}
    </span>
  )
}

/** Banner shown when content for the chosen language is still being generated. */
export function InProgressNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-saffron/40 bg-saffron/10 p-4 text-sm text-ink/80">
      <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-saffron" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p>{children}</p>
    </div>
  )
}
