// Shapes of the synced public/data bundle. Kept in lockstep with scripts/sync-data.mjs.

export type Lang = 'english' | 'gujarati' | 'hindi'
export const LANGS: Lang[] = ['english', 'gujarati', 'hindi']

export interface LangMeta {
  key: Lang
  label: string // native autonym
  short: string // toggle pill text
  dir: 'ltr'
}

export interface SutraMeta {
  name_native: string
  name_translit: string
  name_en: string
  kind: string
  bookPages?: string
  pdfPages?: number[]
  gathaCount?: number
  smaranNo?: number
  role: string
  usedIn: string[]
}

export type VidhiStep = {
  type: 'vidhi'
  id: string
  summary_en: string
  bookPages?: string
  avashyaka?: number | null
}
export type SutraStep = {
  type: 'sutra'
  sutraId: string
  avashyaka?: number | null
  note?: string
}
export type SequenceStep = VidhiStep | SutraStep

export interface Overrides {
  wordSubstitution: { from: string; to: string }
  kausagga: string
}

export interface Pratikraman {
  id: string
  name_native: string
  name_translit: string
  name_en: string
  frequency: string
  covers: string
  order: number
  bookPages?: string
  isBase?: boolean
  note?: string
  kausagga?: string
  sharedFrom?: { pratikraman: string; sutras: string[] }
  sequence: SequenceStep[]
  basedOn?: string
  overrides?: Overrides
}

export interface Avashyaka {
  no: number
  name_prakrit: string
  name_sanskrit: string
  function_en: string
  anchorSutras: string[]
}

export interface AppendixItem {
  id: string
  name_native: string
  name_en: string
  bookPages?: string
  pdfPages?: number[]
  sutras?: string[]
  references?: string
}

export interface Availability {
  hasCanonical: boolean
  needsVerseExtraction: boolean
  shlokaCount: number
  prefaces: Record<Lang, boolean>
  translatedShlokas: Record<Lang, number>
  anyTranslated: boolean
}

export interface SiteIndex {
  generatedAt: string
  tradition: string
  traditionAliases: string[]
  source: string
  sourceBook: string
  note: string
  pratikramans: Pratikraman[]
  sutras: Record<string, SutraMeta>
  avashyakas: Avashyaka[]
  appendix: { note?: string; items: AppendixItem[] }
  availability: Record<string, Availability>
  pdfs: string[]
  intro: { hasMarkdown: boolean; markdownPath: string }
  stats: {
    sutraCount: number
    prefaceCount: number
    shlokaCount: number
    translationCount: number
    vidhiStepCount?: number
    vidhiTranslationCount?: number
  }
}

export interface GlossaryTerm {
  term: string
  scriptForm: string
  definition: string
  sutras: string[]
}

export interface PrefaceGlossaryTerm {
  term: string
  scriptForm: string
  definition: string
}

export interface SourceRef {
  title: string
  url: string
  type: string
  consultedFor?: string
}

export interface Preface {
  sutraId: string
  targetLang: Lang
  targetScript: string
  title: string
  summary: string
  ritualPlacement?: string
  authorAndSource?: string
  structureArc?: string
  recurringImagery?: string
  keyThemes?: string[]
  glossary?: PrefaceGlossaryTerm[]
  howToRead?: string
  sources?: SourceRef[]
  notes?: string
}

export interface WordToken {
  token: string
  translit: string
  gloss: string
  partOfSpeech: string
  etymology?: string
  notes?: string
}

export interface CrossReference {
  text: string
  source: string
}

export interface Elaboration {
  verseByVerseCommentary?: string
  doctrinalContext?: string
  practicalRelevance?: string
  crossReferences?: CrossReference[]
}

export interface ShlokaTranslation {
  shlokaId: string
  targetLang: Lang
  targetScript: string
  plainMeaning?: string
  recitation?: string
  wordByWord?: WordToken[]
  literalTranslation?: string
  idiomaticTranslation?: string
  elaboration?: Elaboration
  sources?: SourceRef[]
  translatorConfidence?: number
  notes?: string
}

export interface Shloka {
  shlokaId: string
  number: number
  printedNumber: number | string
  native_script: string
  script: string
  reconcile_confidence?: number
  source_ids?: string[]
  translations: Record<Lang, ShlokaTranslation | null>
}

export interface SutraBundle {
  sutraId: string
  name_native: string
  name_translit: string
  name_en: string
  kind: string
  role: string
  script: string
  bookPages?: string
  pdfPages?: number[]
  gathaCount?: number
  smaranNo?: number
  usedIn: string[]
  needsVerseExtraction: boolean
  availability: Availability
  prefaces: Record<Lang, Preface | null>
  shlokas: Shloka[]
}

export type PosLabels = Record<string, Record<Lang, string>>

/* ----------------------------------------------------------------- vidhi */
export type VidhiSegmentKind = 'adesh' | 'direction' | 'formula'

export interface VidhiNativeSegment {
  segmentId: string
  kind: VidhiSegmentKind
  speaker: 'shishya' | 'guru' | null
  native_script: string
  script: string
  source_ids?: string[]
  leadsToSutra?: string | null
}

export interface VidhiRitualTerm {
  term: string
  gloss: string
}

export interface VidhiTranslatedSegment {
  segmentId: string
  recitation?: string
  plainMeaning?: string
  idiomaticTranslation?: string
  explanation?: string
  ritualTerms?: VidhiRitualTerm[]
}

export interface VidhiTranslation {
  vidhiId: string
  targetLang: Lang
  targetScript: string
  title?: string
  summary?: string
  segments: VidhiTranslatedSegment[]
  sources?: SourceRef[]
  translatorConfidence?: number
  notes?: string
}

export interface VidhiStepData {
  vidhiId: string
  pratikraman: string
  summary_en: string
  bookPages?: string
  pdfPages?: number[]
  needsExtraction: boolean
  segments: VidhiNativeSegment[]
  translations: Record<Lang, VidhiTranslation | null>
  translatedLangs: Record<Lang, boolean>
}

export interface VidhiBundle {
  generatedAt: string
  steps: Record<string, VidhiStepData>
}

export interface GlossaryBundle {
  generatedAt: string
  languages: Record<Lang, { lang: Lang; generatedAt?: string; terms: GlossaryTerm[] }>
  posLabels: PosLabels
}

export interface SearchRecord {
  type: 'sutra' | 'shloka' | 'glossary' | 'vidhi'
  id: string
  sutraId?: string
  vidhiId?: string
  pratikraman?: string
  kind?: string
  lang?: Lang
  label: string
  sub?: string
  native?: string
  printedNumber?: number | string
  sutras?: string[]
  text: string
}

export interface SearchIndex {
  generatedAt: string
  records: SearchRecord[]
}
