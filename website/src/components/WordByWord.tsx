import type { Lang, PosLabels, WordToken } from '../types'
import { posLabel } from '../utils'
import { scriptClass } from '../config'
import { useLang } from '../state/AppState'

const POS_COLORS: Record<string, string> = {
  noun: 'text-indigo',
  verb: 'text-maroon',
  compound: 'text-saffron',
  adjective: 'text-jgreen',
  adj: 'text-jgreen',
  particle: 'text-muted',
  pronoun: 'text-indigo',
  invocation: 'text-gold',
}

/** Word-by-word table: token · IAST translit · gloss · part-of-speech · etymology. */
export function WordByWord({
  tokens,
  lang,
  posLabels,
}: {
  tokens: WordToken[]
  lang: Lang
  posLabels: PosLabels
}) {
  const { t } = useLang()
  if (!tokens?.length) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="py-2 pr-3 font-semibold">{t('wbw.word')}</th>
            <th className="py-2 pr-3 font-semibold">{t('wbw.iast')}</th>
            <th className="py-2 pr-3 font-semibold">{t('wbw.meaning')}</th>
            <th className="py-2 pr-3 font-semibold">{t('wbw.type')}</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((t, i) => (
            <tr key={i} className="border-b border-line/60 align-top last:border-0">
              <td className={`py-2.5 pr-3 text-base ${scriptClass('gujarati')}`}>{t.token}</td>
              <td className="py-2.5 pr-3 font-serif italic text-ink/80">{t.translit}</td>
              <td className={`py-2.5 pr-3 ${scriptClass(lang)}`}>
                {t.gloss}
                {t.etymology && (
                  <span className="mt-1 block text-xs leading-relaxed text-muted">{t.etymology}</span>
                )}
                {t.notes && (
                  <span className="mt-1 block text-xs italic leading-relaxed text-muted/80">{t.notes}</span>
                )}
              </td>
              <td className="py-2.5 pr-3">
                <span className={`text-xs font-medium ${POS_COLORS[t.partOfSpeech] || 'text-muted'}`}>
                  {posLabel(posLabels, t.partOfSpeech, lang)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
