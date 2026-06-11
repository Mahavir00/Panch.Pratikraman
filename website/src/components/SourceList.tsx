import type { SourceRef } from '../types'
import { useLang } from '../state/AppState'

const TYPE_ICON: Record<string, string> = {
  dictionary: '📖',
  translation: '🔖',
  reference: '🔗',
  article: '📰',
  scripture: '📜',
}

export function SourceList({ sources }: { sources: SourceRef[] }) {
  const { t } = useLang()
  if (!sources?.length) return null
  return (
    <ul className="space-y-2.5">
      {sources.map((s, i) => (
        <li key={i} className="text-sm">
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="link font-medium"
          >
            <span aria-hidden="true" className="mr-1">{TYPE_ICON[s.type] || '🔗'}</span>
            {s.title}
          </a>
          {s.consultedFor && (
            <span className="mt-0.5 block text-xs text-muted">{t('source.consultedFor')} {s.consultedFor}</span>
          )}
        </li>
      ))}
    </ul>
  )
}
