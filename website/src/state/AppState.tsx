import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Lang } from '../types'
import { translate, type TFunc } from '../i18n'

/* ------------------------------------------------------------- localStorage */
function usePersistentState<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw != null ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  const set = useCallback(
    (v: T | ((p: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          /* ignore quota / privacy-mode errors */
        }
        return next
      })
    },
    [key]
  )
  return [value, set]
}

/* ---------------------------------------------------------------- Language */
interface LanguageCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: TFunc
}
const LanguageContext = createContext<LanguageCtx | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = usePersistentState<Lang>('ppt.lang', 'english')
  const value = useMemo<LanguageCtx>(
    () => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }),
    [lang, setLang]
  )
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang(): LanguageCtx {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}

/* ------------------------------------------------------------------- Theme */
type Theme = 'light' | 'dark'
interface ThemeCtx {
  theme: Theme
  toggle: () => void
}
const ThemeContext = createContext<ThemeCtx | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = usePersistentState<Theme>(
    'ppt.theme',
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  )
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [setTheme])
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

/* --------------------------------------------------- Bookmarks & recently viewed */
export interface MarkRef {
  kind: 'sutra' | 'shloka'
  id: string // sutraId, or shlokaId for a shloka
  sutraId: string
  label: string
  sub?: string
}
interface LibraryCtx {
  bookmarks: MarkRef[]
  recent: MarkRef[]
  isBookmarked: (id: string) => boolean
  toggleBookmark: (m: MarkRef) => void
  pushRecent: (m: MarkRef) => void
}
const LibraryContext = createContext<LibraryCtx | null>(null)

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = usePersistentState<MarkRef[]>('ppt.bookmarks', [])
  const [recent, setRecent] = usePersistentState<MarkRef[]>('ppt.recent', [])

  const isBookmarked = useCallback((id: string) => bookmarks.some((b) => b.id === id), [bookmarks])

  const toggleBookmark = useCallback(
    (m: MarkRef) =>
      setBookmarks((prev) =>
        prev.some((b) => b.id === m.id) ? prev.filter((b) => b.id !== m.id) : [m, ...prev].slice(0, 200)
      ),
    [setBookmarks]
  )

  const pushRecent = useCallback(
    (m: MarkRef) =>
      setRecent((prev) => [m, ...prev.filter((r) => r.id !== m.id)].slice(0, 12)),
    [setRecent]
  )

  const value = useMemo(
    () => ({ bookmarks, recent, isBookmarked, toggleBookmark, pushRecent }),
    [bookmarks, recent, isBookmarked, toggleBookmark, pushRecent]
  )
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary(): LibraryCtx {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
  return ctx
}
