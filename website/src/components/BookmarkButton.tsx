import type { MarkRef } from '../state/AppState'
import { useLibrary, useLang } from '../state/AppState'

export function BookmarkButton({ mark, className = '' }: { mark: MarkRef; className?: string }) {
  const { isBookmarked, toggleBookmark } = useLibrary()
  const { t } = useLang()
  const on = isBookmarked(mark.id)
  return (
    <button
      type="button"
      onClick={() => toggleBookmark(mark)}
      aria-pressed={on}
      className={`btn px-2.5 py-1 text-xs ${on ? 'border-saffron text-maroon' : ''} ${className}`}
      title={on ? t('common.saved') : t('common.save')}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill={on ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      </svg>
      {on ? t('common.saved') : t('common.save')}
    </button>
  )
}
