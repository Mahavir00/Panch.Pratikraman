import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { LotusMark } from './Motifs'
import { LanguageToggle, ThemeToggle } from './Toggles'
import { SearchDialog } from './SearchDialog'
import { useLang } from '../state/AppState'
import { useAsync } from '../state/useAsync'
import { loadIndex } from '../data'
import { locPratikramanName } from '../contentI18n'
import type { Pratikraman } from '../types'

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [ritesOpen, setRitesOpen] = useState(false)
  const loc = useLocation()
  const { lang, t } = useLang()
  const { data: index } = useAsync(() => loadIndex(), [])
  const rites = [...(index?.pratikramans || [])].sort((a, b) => a.order - b.order)
  const ritesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenuOpen(false)
    setRitesOpen(false)
  }, [loc.pathname])

  // Close the rites dropdown on outside click / Escape.
  useEffect(() => {
    if (!ritesOpen) return
    const onDown = (e: MouseEvent) => {
      if (ritesRef.current && !ritesRef.current.contains(e.target as Node)) setRitesOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setRitesOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [ritesOpen])

  // Cmd/Ctrl-K opens search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const ritesActive = loc.pathname.startsWith('/p/')

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-ground/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-3">
        <Link to="/" className="group flex min-w-0 items-center gap-2.5">
          <LotusMark className="h-9 w-9 shrink-0 text-maroon transition group-hover:text-saffron" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-serif text-base font-semibold tracking-tight sm:text-lg">
              Pañca Pratikramaṇa
            </span>
            <span className="truncate text-[0.68rem] uppercase tracking-[0.16em] text-muted">
              {t('brand.subtitle')}
            </span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Primary">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-full px-3 py-1.5 text-sm font-medium transition ${
                isActive ? 'bg-surface-2 text-maroon' : 'text-ink/80 hover:text-maroon'
              }`
            }
          >
            {t('nav.home')}
          </NavLink>

          {/* Pratikramaṇas — dropdown to pick one of the five rites. */}
          <div className="relative" ref={ritesRef}>
            <button
              type="button"
              onClick={() => setRitesOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={ritesOpen}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                ritesActive || ritesOpen ? 'bg-surface-2 text-maroon' : 'text-ink/80 hover:text-maroon'
              }`}
            >
              {t('nav.rites')}
              <svg
                viewBox="0 0 24 24"
                className={`h-3.5 w-3.5 transition-transform ${ritesOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {ritesOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-surface shadow-card-lg animate-fade-in"
              >
                {rites.map((p) => (
                  <RiteMenuItem key={p.id} p={p} lang={lang} active={loc.pathname === `/p/${p.id}`} />
                ))}
              </div>
            )}
          </div>

          {[
            { to: '/glossary', key: 'nav.glossary' },
            { to: '/about', key: 'nav.about' },
          ].map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  isActive ? 'bg-surface-2 text-maroon' : 'text-ink/80 hover:text-maroon'
                }`
              }
            >
              {t(n.key)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="btn h-11 gap-2 px-3 text-sm sm:h-9"
            aria-label={t('search.aria')}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
            <span className="hidden lg:inline">{t('search.button')}</span>
            <kbd className="hidden rounded border border-line px-1 text-[0.6rem] text-muted lg:inline">⌘K</kbd>
          </button>
          <LanguageToggle className="hidden sm:inline-flex" />
          <ThemeToggle />
          <button
            type="button"
            className="btn h-11 w-11 p-0 md:hidden sm:h-9 sm:w-9"
            aria-label={t('toggle.menu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {menuOpen ? <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-surface md:hidden">
          <nav className="container-page flex flex-col py-2" aria-label="Mobile">
            <NavLink to="/" end className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface-2">
              {t('nav.home')}
            </NavLink>
            {/* The five rites, listed for direct selection. */}
            <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">
              {t('nav.rites')}
            </p>
            {rites.map((p) => (
              <NavLink
                key={p.id}
                to={`/p/${p.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-surface-2 ${
                    isActive ? 'text-maroon' : 'text-ink/85'
                  }`
                }
              >
                <span className="x-guj">{p.name_native}</span>
                <span className="text-xs text-muted">{locPratikramanName(lang, p.id, p.name_en)}</span>
              </NavLink>
            ))}
            <NavLink to="/glossary" className="mt-1 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface-2">
              {t('nav.glossary')}
            </NavLink>
            <NavLink to="/about" className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface-2">
              {t('nav.about')}
            </NavLink>
            <div className="px-3 py-2">
              <LanguageToggle />
            </div>
          </nav>
        </div>
      )}

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}

/** One rite row in the desktop Pratikramaṇas dropdown. */
function RiteMenuItem({ p, lang, active }: { p: Pratikraman; lang: import('../types').Lang; active: boolean }) {
  return (
    <Link
      to={`/p/${p.id}`}
      role="menuitem"
      className={`flex items-center justify-between gap-3 px-4 py-2.5 transition hover:bg-surface-2 ${
        active ? 'bg-surface-2' : ''
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate font-serif text-sm font-medium text-ink">
          {locPratikramanName(lang, p.id, p.name_en)}
        </span>
        <span className="block truncate text-xs text-muted x-guj">{p.name_native}</span>
      </span>
      <span className="shrink-0 text-[0.65rem] uppercase tracking-wide text-saffron">#{p.order}</span>
    </Link>
  )
}
