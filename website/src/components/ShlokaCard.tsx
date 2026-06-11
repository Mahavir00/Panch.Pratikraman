import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Lang, PosLabels, PrefaceGlossaryTerm, Shloka } from '../types'
import { BASE, NATIVE_SCRIPT_CLASS, scriptClass } from '../config'
import { shlokaAnchor } from '../utils'
import { useLang } from '../state/AppState'
import { CopyButton } from './CopyButton'
import { Disclosure } from './Disclosure'
import { WordByWord } from './WordByWord'
import { GlossaryText } from './GlossaryText'
import { SourceList } from './SourceList'
import { InProgressNote } from './Progress'

function LayerLabel({ children }: { children: React.ReactNode }) {
  return <div className="label-eyebrow mb-1.5">{children}</div>
}

export function ShlokaCard({
  shloka,
  lang,
  posLabels,
  glossaryTerms,
  index,
}: {
  shloka: Shloka
  lang: Lang
  posLabels: PosLabels
  glossaryTerms: PrefaceGlossaryTerm[]
  index: number
}) {
  const tr = shloka.translations[lang]
  const { t } = useLang()
  const [showLiteral, setShowLiteral] = useState(false)
  const anchor = shlokaAnchor(shloka.shlokaId)
  const sc = scriptClass(lang)
  // Shareable absolute URL: keep the HashRouter route, append an inner hash.
  const sutraId = shloka.shlokaId.split('/')[0]
  const shareUrl = `${window.location.origin}${BASE}#/s/${sutraId}#${anchor}`

  return (
    <article
      id={anchor}
      className="card scroll-mt-24 p-5 sm:p-7 animate-fade-in"
      style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}
    >
      {/* verse number + provenance */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          to={{ hash: `#${anchor}` }}
          className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-gold/50 bg-gold/10 px-2 font-serif text-sm font-semibold text-gold"
          title={t('shloka.verseLinkTitle')}
        >
          {shloka.printedNumber}
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{t('shloka.verse', { n: shloka.number })}</span>
          <CopyButton text={shareUrl} label={t('common.link')} title={t('shloka.linkTitle')} />
        </div>
      </div>

      {/* 1 — original verse (Gujarati), the visual centerpiece */}
      {shloka.native_script ? (
        <div className="group relative">
          <p
            lang="gu"
            className={`${NATIVE_SCRIPT_CLASS} text-pretty text-2xl leading-relaxed text-ink sm:text-[1.7rem]`}
          >
            {shloka.native_script}
          </p>
          <div className="mt-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <CopyButton text={shloka.native_script} label={t('shloka.copyVerse')} />
          </div>
        </div>
      ) : (
        <InProgressNote>{t('progress.verseTextPending')}</InProgressNote>
      )}

      {!tr ? (
        <div className="mt-5">
          <InProgressNote>{t('progress.verseInProgress')}</InProgressNote>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* 2 — recitation line */}
          {tr.recitation && (
            <div className="rounded-xl border border-saffron/30 bg-saffron/5 p-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <LayerLabel>{lang === 'english' ? t('shloka.toReciteIast') : t('shloka.toRecite')}</LayerLabel>
                <CopyButton text={tr.recitation} />
              </div>
              <p className={`text-lg leading-relaxed ${lang === 'english' ? 'font-serif italic' : sc}`}>
                {tr.recitation}
              </p>
            </div>
          )}

          {/* 3 — plain meaning */}
          {tr.plainMeaning && (
            <div>
              <LayerLabel>{t('shloka.plainMeaning')}</LayerLabel>
              <p className={`text-lg leading-relaxed ${sc}`}>
                <GlossaryText text={tr.plainMeaning} terms={glossaryTerms} />
              </p>
            </div>
          )}

          {/* 4 — idiomatic / literal toggle */}
          {(tr.idiomaticTranslation || tr.literalTranslation) && (
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <LayerLabel>{showLiteral ? t('shloka.literal') : t('shloka.idiomatic')}</LayerLabel>
                {tr.idiomaticTranslation && tr.literalTranslation && (
                  <button
                    type="button"
                    className="text-xs font-medium text-maroon underline decoration-saffron/50 underline-offset-2"
                    onClick={() => setShowLiteral((v) => !v)}
                  >
                    {showLiteral ? t('shloka.showIdiomatic') : t('shloka.showLiteral')}
                  </button>
                )}
              </div>
              <p className={`leading-relaxed text-ink/90 ${sc}`}>
                <GlossaryText
                  text={
                    (showLiteral ? tr.literalTranslation : tr.idiomaticTranslation) ||
                    tr.idiomaticTranslation ||
                    tr.literalTranslation ||
                    ''
                  }
                  terms={glossaryTerms}
                />
              </p>
            </div>
          )}

          {/* 5 — word-by-word (collapsed) */}
          {tr.wordByWord && tr.wordByWord.length > 0 && (
            <Disclosure title={t('shloka.wordByWord')} count={tr.wordByWord.length}>
              <WordByWord tokens={tr.wordByWord} lang={lang} posLabels={posLabels} />
            </Disclosure>
          )}

          {/* 6 — commentary layers (collapsed) */}
          {tr.elaboration && (
            <div className="space-y-3">
              {tr.elaboration.verseByVerseCommentary && (
                <Disclosure title={t('shloka.commentary')} defaultOpen={false}>
                  <p className={`prose-sacred ${sc}`}>
                    <GlossaryText text={tr.elaboration.verseByVerseCommentary} terms={glossaryTerms} />
                  </p>
                </Disclosure>
              )}
              {tr.elaboration.doctrinalContext && (
                <Disclosure title={t('shloka.doctrinalContext')}>
                  <p className={`prose-sacred ${sc}`}>
                    <GlossaryText text={tr.elaboration.doctrinalContext} terms={glossaryTerms} />
                  </p>
                </Disclosure>
              )}
              {tr.elaboration.practicalRelevance && (
                <Disclosure title={t('shloka.practicalRelevance')}>
                  <p className={`prose-sacred ${sc}`}>
                    <GlossaryText text={tr.elaboration.practicalRelevance} terms={glossaryTerms} />
                  </p>
                </Disclosure>
              )}
              {tr.elaboration.crossReferences && tr.elaboration.crossReferences.length > 0 && (
                <Disclosure title={t('shloka.crossReferences')} count={tr.elaboration.crossReferences.length}>
                  <ul className="space-y-3">
                    {tr.elaboration.crossReferences.map((c, i) => (
                      <li key={i} className="text-sm">
                        <span className={sc}>{c.text}</span>
                        <span className="mt-0.5 block text-xs text-muted">— {c.source}</span>
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              )}
            </div>
          )}

          {/* sources + confidence */}
          {tr.sources && tr.sources.length > 0 && (
            <Disclosure title={t('shloka.sources')} count={tr.sources.length}>
              <SourceList sources={tr.sources} />
            </Disclosure>
          )}
          {typeof tr.translatorConfidence === 'number' && (
            <p className="text-right text-xs text-muted">
              {t('shloka.confidence')} ·{' '}
              <span className="font-medium">{Math.round(tr.translatorConfidence * 100)}%</span>
            </p>
          )}
        </div>
      )}
    </article>
  )
}
