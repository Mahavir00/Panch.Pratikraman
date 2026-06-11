import type { Lang, LangMeta } from './types'

export const BASE = import.meta.env.BASE_URL // e.g. "/Panch.Pratikraman/"

/** Build a URL to a static asset under the deploy base (never an absolute "/..."). */
export const asset = (p: string) => BASE + p.replace(/^\//, '')

/** Build a URL into the synced data bundle. */
export const dataUrl = (p: string) => asset('data/' + p.replace(/^\//, ''))

export const LANG_META: Record<Lang, LangMeta> = {
  english: { key: 'english', label: 'English', short: 'EN', dir: 'ltr' },
  gujarati: { key: 'gujarati', label: 'ગુજરાતી', short: 'ગુ', dir: 'ltr' },
  hindi: { key: 'hindi', label: 'हिन्दी', short: 'हि', dir: 'ltr' },
}

export const LANG_ORDER: Lang[] = ['english', 'gujarati', 'hindi']

/** Font/script helper class for a target language's native text. */
export function scriptClass(lang: Lang): string {
  if (lang === 'gujarati') return 'x-guj'
  if (lang === 'hindi') return 'x-deva'
  return ''
}

/** Native Gujarati source verses always render in the Gujarati face. */
export const NATIVE_SCRIPT_CLASS = 'x-guj'

export const REPO = 'Panch.Pratikraman'
export const GITHUB_URL = 'https://github.com/'
