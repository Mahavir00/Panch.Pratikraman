import type { Avashyaka } from '../types'
import { Tooltip } from './Tooltip'
import { useLang } from '../state/AppState'
import { locAvFn, locAvPrakrit, locAvSanskrit } from '../contentI18n'

/** Badge marking a sequence step as one of the six Āvaśyakas. */
export function AvashyakaBadge({
  no,
  avashyakas,
  compact = false,
}: {
  no: number
  avashyakas: Avashyaka[]
  compact?: boolean
}) {
  const { lang, t } = useLang()
  const av = avashyakas.find((a) => a.no === no)
  const ord = t(`av.ordinal.${no}`)
  const sanskrit = av ? locAvSanskrit(lang, no, av.name_sanskrit) : ''
  const prakrit = av ? locAvPrakrit(lang, no, av.name_prakrit) : ''
  const label = av ? `${prakrit} · ${sanskrit}` : `${t('av.word')} ${no}`
  const content = av ? (
    <span>
      <strong>
        {ord} {t('av.word')} — {sanskrit}
      </strong>
      <br />
      {locAvFn(lang, no, av.function_en)}
    </span>
  ) : (
    `${ord} ${t('av.word')}`
  )
  return (
    <Tooltip content={content}>
      <span className="inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 text-[0.68rem] font-semibold text-gold">
        <span aria-hidden="true">◈</span>
        {compact ? t('av.short', { n: no }) : label}
      </span>
    </Tooltip>
  )
}

/** Six-Āvaśyaka legend strip. */
export function AvashyakaLegend({ avashyakas }: { avashyakas: Avashyaka[] }) {
  const { lang } = useLang()
  return (
    <div className="flex flex-wrap gap-2">
      {avashyakas.map((a) => (
        <Tooltip key={a.no} content={locAvFn(lang, a.no, a.function_en)}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs">
            <span className="font-semibold text-gold">{a.no}</span>
            <span className="font-medium">{locAvSanskrit(lang, a.no, a.name_sanskrit)}</span>
          </span>
        </Tooltip>
      ))}
    </div>
  )
}
