import { Link } from 'react-router-dom'
import { useState } from 'react'
import type {
  Avashyaka,
  Lang,
  SiteIndex,
  SutraStep,
  VidhiNativeSegment,
  VidhiStep,
  VidhiStepData,
  VidhiTranslation,
} from '../types'
import { NATIVE_SCRIPT_CLASS, scriptClass } from '../config'
import { formatPages, isShared } from '../utils'
import { useLang } from '../state/AppState'
import { locSutraName, locSutraRole, locStepNote, locVidhi } from '../contentI18n'
import { AvashyakaBadge } from './Avashyaka'
import { ProgressMeter, InProgressNote } from './Progress'
import { CopyButton } from './CopyButton'
import { Tooltip } from './Tooltip'

/** A procedural "instruction" step in the recitation sequence. */
export function VidhiCard({
  step,
  avashyakas,
  data,
  index,
}: {
  step: VidhiStep
  avashyakas: Avashyaka[]
  data?: VidhiStepData
  index?: SiteIndex
}) {
  const { lang, t } = useLang()
  const [open, setOpen] = useState(false)
  const pages = formatPages(step.bookPages)
  const tr = data?.translations?.[lang] || null
  const hasDetail = !!data && data.segments.length > 0
  const anyTranslated = data ? Object.values(data.translatedLangs).some(Boolean) : false

  return (
    <div className="relative rounded-xl border border-dashed border-line bg-surface-2/60 p-4">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5h10M9 12h10M9 19h10M4.5 5h.01M4.5 12h.01M4.5 19h.01" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="label-eyebrow !text-muted">{t('vidhi.label')}</span>
            {typeof step.avashyaka === 'number' && (
              <AvashyakaBadge no={step.avashyaka} avashyakas={avashyakas} compact />
            )}
            {hasDetail && (
              <span className="chip border-saffron/40 bg-saffron/10 text-saffron">
                {data!.segments.filter((s) => s.kind === 'adesh').length > 0
                  ? `${data!.segments.length} · ${t('vidhi.adesh')}`
                  : data!.segments.length}
              </span>
            )}
          </div>
          {/* Localized step title (translation) falls back to the curated summary. */}
          <p className="text-sm leading-relaxed text-ink/85">
            {tr?.summary || locVidhi(lang, step.id, step.summary_en)}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {pages && <span className="text-xs text-muted">{t('vidhi.goldenText', { pages })}</span>}
            {hasDetail && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="inline-flex items-center gap-1 text-xs font-medium text-maroon underline decoration-saffron/50 underline-offset-2"
              >
                {open ? t('vidhi.hide') : t('vidhi.show')}
                <svg
                  viewBox="0 0 24 24"
                  className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>

          {open && hasDetail && (
            <div className="mt-3 animate-fade-in">
              {!tr && anyTranslated ? (
                <InProgressNote>{t('vidhi.inProgress')}</InProgressNote>
              ) : (
                <ol className="space-y-3">
                  {data!.segments.map((seg) => (
                    <li key={seg.segmentId}>
                      <VidhiSegmentView
                        seg={seg}
                        tr={tr}
                        lang={lang}
                        index={index}
                      />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const SEG_KIND_KEY: Record<string, string> = {
  adesh: 'vidhi.adesh',
  direction: 'vidhi.direction',
  formula: 'vidhi.formula',
}

function VidhiSegmentView({
  seg,
  tr,
  lang,
  index,
}: {
  seg: VidhiNativeSegment
  tr: VidhiTranslation | null
  lang: Lang
  index?: SiteIndex
}) {
  const { t } = useLang()
  const sc = scriptClass(lang)
  const segTr = tr?.segments?.find((s) => s.segmentId === seg.segmentId)
  const leadMeta = seg.leadsToSutra ? index?.sutras[seg.leadsToSutra] : undefined

  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
            seg.kind === 'adesh'
              ? 'border border-maroon/40 bg-maroon/10 text-maroon'
              : seg.kind === 'formula'
                ? 'border border-gold/40 bg-gold/10 text-gold'
                : 'border border-line bg-surface-2 text-muted'
          }`}
        >
          {t(SEG_KIND_KEY[seg.kind] || 'vidhi.direction')}
        </span>
        {seg.speaker && (
          <span className="text-[0.65rem] uppercase tracking-wide text-muted">
            {t(`vidhi.speaker.${seg.speaker}`)}
          </span>
        )}
      </div>

      {/* Native ādeśa text (Gujarati source). */}
      <p className={`${NATIVE_SCRIPT_CLASS} text-pretty leading-relaxed text-ink`}>{seg.native_script}</p>

      {/* Recitation in the target script (chant line) — present for ādeśa/formula. */}
      {segTr?.recitation && (
        <div className="mt-2 rounded-md border border-saffron/30 bg-saffron/5 p-2.5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="label-eyebrow">{t('vidhi.toRecite')}</span>
            <CopyButton text={segTr.recitation} />
          </div>
          <p className={`leading-relaxed ${lang === 'english' ? 'font-serif italic' : sc}`}>
            {segTr.recitation}
          </p>
        </div>
      )}

      {/* Meaning + explanation. */}
      {segTr?.plainMeaning && <p className={`mt-2 text-sm leading-relaxed text-ink/90 ${sc}`}>{segTr.plainMeaning}</p>}
      {segTr?.idiomaticTranslation && segTr.idiomaticTranslation !== segTr.plainMeaning && (
        <p className={`mt-1.5 text-sm leading-relaxed text-ink/75 ${sc}`}>{segTr.idiomaticTranslation}</p>
      )}
      {segTr?.explanation && (
        <p className={`mt-1.5 text-xs italic leading-relaxed text-muted ${sc}`}>{segTr.explanation}</p>
      )}

      {/* Ritual-term glosses. */}
      {segTr?.ritualTerms && segTr.ritualTerms.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {segTr.ritualTerms.map((rt, i) => (
            <Tooltip key={i} content={rt.gloss}>
              <span className="text-xs">{rt.term}</span>
            </Tooltip>
          ))}
        </div>
      )}

      {/* Link into the sūtra this ādeśa introduces. */}
      {seg.leadsToSutra && leadMeta && (
        <Link
          to={`/s/${seg.leadsToSutra}`}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-maroon hover:text-saffron"
        >
          {t('vidhi.leadsTo')} · <span className={NATIVE_SCRIPT_CLASS}>{leadMeta.name_native}</span>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
    </div>
  )
}

/** A clickable sūtra step in the recitation sequence. */
export function SutraStepCard({
  step,
  index,
  avashyakas,
}: {
  step: SutraStep
  index: SiteIndex
  avashyakas: Avashyaka[]
}) {
  const { lang, t } = useLang()
  const meta = index.sutras[step.sutraId]
  const avail = index.availability[step.sutraId]
  if (!meta) {
    return (
      <div className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
        {t('step.unknownSutra', { id: step.sutraId })}
      </div>
    )
  }
  const shared = isShared(meta.usedIn)
  return (
    <Link
      to={`/s/${step.sutraId}`}
      className="group block rounded-xl border border-line bg-surface p-4 shadow-card transition hover:border-saffron hover:shadow-card-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`${NATIVE_SCRIPT_CLASS} text-lg font-semibold text-ink`}>{meta.name_native}</h3>
          <p className="text-sm text-muted">
            <span className="font-serif italic">{meta.name_translit}</span>
            {meta.name_en ? ` · ${locSutraName(lang, step.sutraId, meta.name_en)}` : ''}
          </p>
        </div>
        <svg
          viewBox="0 0 24 24"
          className="mt-1 h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-saffron"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {meta.role && <p className="mt-2 text-sm leading-relaxed text-ink/75">{locSutraRole(lang, step.sutraId, meta.role)}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {typeof step.avashyaka === 'number' && (
          <AvashyakaBadge no={step.avashyaka} avashyakas={avashyakas} />
        )}
        {shared && (
          <span className="chip" title={t('step.sharedTitle', { list: meta.usedIn.join(', ') })}>
            <span aria-hidden="true">↔</span> {t('step.shared')}
          </span>
        )}
        {typeof meta.gathaCount === 'number' && <span className="chip">{t('sutra.gatha', { n: meta.gathaCount })}</span>}
        {avail && <ProgressMeter availability={avail} />}
      </div>
      {step.note && <p className="mt-2 text-xs italic text-muted">{locStepNote(lang, step.note)}</p>}
    </Link>
  )
}
