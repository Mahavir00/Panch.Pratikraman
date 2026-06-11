import type { Lang, Pratikraman, PosLabels } from './types'

/** Localize a partOfSpeech enum key via pos-labels (graceful fallback). */
export function posLabel(labels: PosLabels, key: string, lang: Lang): string {
  const entry = labels?.[key]
  if (entry && entry[lang]) return entry[lang]
  // Title-case the raw enum as a last resort.
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : ''
}

/** A sutra is "shared" if more than one pratikraman uses it. */
export const isShared = (usedIn: string[] | undefined) => (usedIn?.length ?? 0) > 1

/** Resolve the base pratikraman for a basedOn reference. */
export function resolveBase(
  list: Pratikraman[],
  p: Pratikraman
): Pratikraman | undefined {
  if (!p.basedOn) return undefined
  return list.find((x) => x.id === p.basedOn)
}

/** Format a page reference like "p. 80" / "pp. 80–82" from a "80" / "80-82" string. */
export function formatPages(bookPages?: string): string | null {
  if (!bookPages) return null
  const s = bookPages.trim()
  if (!s) return null
  return s.includes('-') || s.includes('–') ? `pp. ${s.replace('-', '–')}` : `p. ${s}`
}

/** Copy text to clipboard, resolving to success boolean. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const SLUG = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
export { SLUG as slug }

/** Anchor id for a shloka (the part after the slash). */
export const shlokaAnchor = (shlokaId: string) => shlokaId.split('/').pop() || shlokaId

/** Clamp helper. */
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Roman-numeral-free ordinal-ish label for an avashyaka number. */
export const avashyakaOrdinal = (n: number) =>
  ['', '1st', '2nd', '3rd', '4th', '5th', '6th'][n] || `${n}th`
