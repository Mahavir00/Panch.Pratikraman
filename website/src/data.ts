import { dataUrl } from './config'
import type { GlossaryBundle, SearchIndex, SiteIndex, SutraBundle, VidhiBundle } from './types'

// Simple in-memory caches so navigation never re-fetches the same bundle.
const cache = new Map<string, Promise<unknown>>()

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`)
  return (await res.json()) as T
}

function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, loader().catch((e) => {
    cache.delete(key) // allow retry after a failure
    throw e
  }))
  return cache.get(key) as Promise<T>
}

export const loadIndex = () => cached('index', () => fetchJson<SiteIndex>(dataUrl('index.json')))

export const loadGlossary = () =>
  cached('glossary', () => fetchJson<GlossaryBundle>(dataUrl('glossary.json')))

export const loadSearchIndex = () =>
  cached('search', () => fetchJson<SearchIndex>(dataUrl('search-index.json')))

export const loadSutra = (id: string) =>
  cached(`sutra:${id}`, () => fetchJson<SutraBundle>(dataUrl(`sutra/${id}.json`)))

export const loadVidhi = () => cached('vidhi', () => fetchJson<VidhiBundle>(dataUrl('vidhi.json')))

export async function loadIntroMarkdown(): Promise<string> {
  return cached('intro-md', async () => {
    const res = await fetch(dataUrl('achhalgach.md'))
    if (!res.ok) throw new Error('intro markdown unavailable')
    return res.text()
  })
}
