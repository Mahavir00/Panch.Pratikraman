import { LANG_ORDER, LANG_META } from '../config'
import { useLang, useTheme } from '../state/AppState'

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useLang()
  return (
    <div
      className={`inline-flex rounded-full border border-line bg-surface p-0.5 ${className}`}
      role="group"
      aria-label={t('toggle.lang')}
    >
      {LANG_ORDER.map((l) => {
        const active = l === lang
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            title={LANG_META[l].label}
            className={`min-w-[2.6rem] rounded-full px-3 py-1.5 text-sm font-medium transition sm:py-1 ${
              active ? 'bg-maroon text-white shadow-sm' : 'text-muted hover:text-maroon'
            } ${l !== 'english' ? (l === 'gujarati' ? 'x-guj' : 'x-deva') : ''}`}
          >
            {LANG_META[l].short}
          </button>
        )
      })}
    </div>
  )
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const { t } = useLang()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      className={`btn h-11 w-11 rounded-full p-0 sm:h-9 sm:w-9 ${className}`}
      aria-label={dark ? t('toggle.theme.toLight') : t('toggle.theme.toDark')}
      title={dark ? t('toggle.theme.toLight') : t('toggle.theme.toDark')}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
