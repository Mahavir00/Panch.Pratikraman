#!/usr/bin/env node
// @ts-check
/**
 * sync-data.mjs — build the website's public data bundle from the tool's ../data tree.
 *
 * The translation pipeline is still running, so this script is:
 *   - idempotent: safe to run any number of times,
 *   - partial-tolerant: missing/!parseable files degrade gracefully (never throws),
 *   - re-runnable mid-pipeline: re-run whenever the tool generates or updates JSON.
 *
 * Usage:
 *   node scripts/sync-data.mjs            # one-shot sync
 *   node scripts/sync-data.mjs --watch    # re-sync on any change under ../data
 *
 * Output (website/public/data/):
 *   index.json         structure tree + sutra registry + availability map + pdf list
 *   sutra/<id>.json    one merged file per sutra (verses x 3 prefaces x 3 translations)
 *   glossary.json      the three language glossaries + pos-labels
 *   search-index.json  compact client-side search index
 *   achhalgach.md      copied tradition knowledge base (rendered on the About page)
 *   pdfs/*             copied complementary PDFs, if any
 */
import { promises as fs } from 'node:fs'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WEBSITE = path.resolve(__dirname, '..')
const DATA = path.resolve(WEBSITE, '..', 'data')
const OUT = path.resolve(WEBSITE, 'public', 'data')

const LANGS = /** @type {const} */ (['english', 'gujarati', 'hindi'])

/* ------------------------------------------------------------------ helpers */

const log = (...a) => console.log('[sync-data]', ...a)
const warn = (...a) => console.warn('[sync-data] ⚠', ...a)

/** Read + parse JSON, tolerating absence/corruption. */
async function readJson(p) {
  try {
    const raw = await fs.readFile(p, 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    if (err && err.code !== 'ENOENT') warn(`could not read/parse ${rel(p)}: ${err.message}`)
    return null
  }
}

async function writeJson(p, obj) {
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, JSON.stringify(obj), 'utf8')
}

const rel = (p) => path.relative(WEBSITE, p).replace(/\\/g, '/')

/** shlokaId "sutra/01" -> file-safe "sutra__01". */
const safeId = (shlokaId) => shlokaId.replace(/\//g, '__')

async function listDir(p) {
  try {
    return await fs.readdir(p, { withFileTypes: true })
  } catch {
    return []
  }
}

/* --------------------------------------------------------------------- sync */

async function sync() {
  const started = Date.now()
  const stats = { sutras: 0, prefaces: 0, shlokas: 0, translations: 0, vidhiSteps: 0, vidhiTranslations: 0, missing: [] }

  const structure = await readJson(path.join(DATA, 'corpus', 'pratikraman-structure.json'))
  const canonical = await readJson(path.join(DATA, 'corpus', 'canonical.json'))
  if (!structure) {
    warn('FATAL: data/corpus/pratikraman-structure.json missing or invalid — nothing to build.')
    return false
  }

  // Fresh output dir each run (regenerated bundle; git-ignored).
  await fs.rm(OUT, { recursive: true, force: true })
  await fs.mkdir(OUT, { recursive: true })

  const sutrasMeta = structure.sutras || {}
  const canonicalById = new Map()
  for (const s of canonical?.sutras || []) canonicalById.set(s.sutraId, s)

  const allSutraIds = new Set([...Object.keys(sutrasMeta), ...canonicalById.keys()])

  /** @type {Record<string, any>} */
  const availability = {}
  /** @type {any[]} */
  const searchIndex = []

  for (const sutraId of allSutraIds) {
    const meta = sutrasMeta[sutraId] || {}
    const canon = canonicalById.get(sutraId) || {}
    const dir = path.join(DATA, 'translations', sutraId)

    // Prefaces (one per language).
    const prefaces = {}
    const prefaceAvail = {}
    for (const lang of LANGS) {
      const pf = await readJson(path.join(dir, `_preface.${lang}.json`))
      prefaces[lang] = pf
      prefaceAvail[lang] = !!pf
      if (pf) stats.prefaces++
    }

    // Shlokas, merged with per-language translations.
    const canonShlokas = Array.isArray(canon.shlokas) ? canon.shlokas : []
    const translatedCount = { english: 0, gujarati: 0, hindi: 0 }
    const shlokas = []
    for (const sh of canonShlokas) {
      const translations = {}
      for (const lang of LANGS) {
        const tr = await readJson(path.join(dir, `${safeId(sh.shlokaId)}.${lang}.json`))
        translations[lang] = tr
        if (tr) {
          translatedCount[lang]++
          stats.translations++
        }
      }
      shlokas.push({
        shlokaId: sh.shlokaId,
        number: sh.number,
        printedNumber: sh.printedNumber ?? sh.number,
        native_script: sh.native_script ?? '',
        script: sh.script ?? canon.script ?? 'gujarati',
        reconcile_confidence: sh.reconcile_confidence,
        source_ids: sh.source_ids ?? [],
        translations,
      })
      stats.shlokas++

      // Search records for this shloka.
      const recBits = [sh.native_script || '']
      for (const lang of LANGS) {
        const tr = translations[lang]
        if (tr) {
          recBits.push(tr.recitation || '', tr.plainMeaning || '')
          if (lang === 'english') recBits.push(tr.idiomaticTranslation || '')
        }
      }
      searchIndex.push({
        type: 'shloka',
        id: sh.shlokaId,
        sutraId,
        label: `${meta.name_en || canon.name_en || sutraId}`,
        printedNumber: sh.printedNumber ?? sh.number,
        native: sh.native_script || '',
        text: recBits.join('  ').slice(0, 1400),
      })
    }

    const needsVerseExtraction = !!canon.needsVerseExtraction
    availability[sutraId] = {
      hasCanonical: canonicalById.has(sutraId),
      needsVerseExtraction,
      shlokaCount: canonShlokas.length,
      prefaces: prefaceAvail,
      translatedShlokas: translatedCount,
      anyTranslated:
        translatedCount.english + translatedCount.gujarati + translatedCount.hindi > 0 ||
        prefaceAvail.english || prefaceAvail.gujarati || prefaceAvail.hindi,
    }

    // Per-sutra bundle file.
    const bundle = {
      sutraId,
      name_native: meta.name_native ?? canon.name_native ?? sutraId,
      name_translit: meta.name_translit ?? canon.name_translit ?? '',
      name_en: meta.name_en ?? canon.name_en ?? sutraId,
      kind: meta.kind ?? canon.kind ?? 'sutra',
      role: meta.role ?? canon.role ?? '',
      script: canon.script ?? 'gujarati',
      bookPages: meta.bookPages ?? canon.bookPages ?? '',
      pdfPages: meta.pdfPages ?? canon.pdfPages ?? [],
      gathaCount: meta.gathaCount,
      smaranNo: meta.smaranNo,
      usedIn: meta.usedIn ?? canon.usedIn ?? [],
      needsVerseExtraction,
      availability: availability[sutraId],
      prefaces,
      shlokas,
    }
    await writeJson(path.join(OUT, 'sutra', `${sutraId}.json`), bundle)
    stats.sutras++

    // Search record for the sutra itself.
    searchIndex.push({
      type: 'sutra',
      id: sutraId,
      sutraId,
      label: bundle.name_en,
      sub: bundle.name_translit,
      native: bundle.name_native,
      text: `${bundle.name_en}  ${bundle.name_translit}  ${bundle.name_native}  ${bundle.role}`,
    })
  }

  // Glossaries + pos-labels.
  const glossary = { generatedAt: new Date().toISOString(), languages: {}, posLabels: null }
  for (const lang of LANGS) {
    const g = await readJson(path.join(DATA, 'glossary', `${lang}.json`))
    glossary.languages[lang] = g || { lang, terms: [] }
    for (const t of g?.terms || []) {
      searchIndex.push({
        type: 'glossary',
        id: `${lang}:${t.term}`,
        lang,
        label: t.term,
        native: t.scriptForm || '',
        sutras: t.sutras || [],
        text: `${t.term}  ${t.scriptForm || ''}  ${t.definition || ''}`,
      })
    }
  }
  glossary.posLabels = (await readJson(path.join(DATA, 'glossary', 'pos-labels.json')))?.labels || {}
  await writeJson(path.join(OUT, 'glossary.json'), glossary)

  // Vidhi / ādeśa layer: native steps (corpus/vidhi.json) merged with per-language
  // translations (_vidhi/<vidhiId>.<lang>.json), keyed by vidhiId. Lazy-loaded by the
  // Pratikraman page. Tolerant of partial data, like the sutra layer.
  const vidhiBundle = { generatedAt: new Date().toISOString(), steps: {} }
  const vidhiNative = await readJson(path.join(DATA, 'corpus', 'vidhi.json'))
  for (const step of vidhiNative?.steps || []) {
    const translations = {}
    const translatedLangs = {}
    for (const lang of LANGS) {
      const tr = await readJson(path.join(DATA, 'translations', '_vidhi', `${step.vidhiId}.${lang}.json`))
      translations[lang] = tr
      translatedLangs[lang] = !!tr
      if (tr) stats.vidhiTranslations++
    }
    vidhiBundle.steps[step.vidhiId] = {
      vidhiId: step.vidhiId,
      pratikraman: step.pratikraman,
      summary_en: step.summary_en,
      bookPages: step.bookPages,
      pdfPages: step.pdfPages || [],
      needsExtraction: !!step.needsExtraction,
      segments: step.segments || [],
      translations,
      translatedLangs,
    }
    stats.vidhiSteps++

    // Search records for each ādeśa/spoken segment (so devotees can find them).
    for (const seg of step.segments || []) {
      if (!seg.native_script) continue
      const recBits = [seg.native_script]
      for (const lang of LANGS) {
        const segTr = translations[lang]?.segments?.find((s) => s.segmentId === seg.segmentId)
        if (segTr) recBits.push(segTr.recitation || '', segTr.plainMeaning || '')
      }
      searchIndex.push({
        type: 'vidhi',
        id: seg.segmentId,
        vidhiId: step.vidhiId,
        pratikraman: step.pratikraman,
        kind: seg.kind,
        label: translations.english?.title || step.summary_en?.slice(0, 60) || step.vidhiId,
        native: seg.native_script.slice(0, 80),
        text: recBits.join('  ').slice(0, 1000),
      })
    }
  }
  await writeJson(path.join(OUT, 'vidhi.json'), vidhiBundle)

  // Copy the tradition knowledge base for the About page.
  let hasIntroMd = false
  try {
    const md = await fs.readFile(path.join(DATA, 'tradition-knowledge', 'achhalgach.md'), 'utf8')
    await fs.writeFile(path.join(OUT, 'achhalgach.md'), md, 'utf8')
    hasIntroMd = true
  } catch {
    warn('tradition-knowledge/achhalgach.md not found — About page will use fallback prose.')
  }

  // Copy complementary PDFs (data/pdfs/**/*.pdf), if present.
  const pdfs = await copyPdfs()

  // index.json — the structure tree the app routes from.
  const index = {
    generatedAt: new Date().toISOString(),
    tradition: structure.tradition,
    traditionAliases: structure.traditionAliases || [],
    source: structure.source,
    sourceBook: structure.sourceBook || '',
    note: structure.note || '',
    pratikramans: structure.pratikramans || [],
    sutras: sutrasMeta,
    avashyakas: structure.avashyakas || [],
    appendix: structure.appendix || { items: [] },
    availability,
    pdfs,
    intro: { hasMarkdown: hasIntroMd, markdownPath: 'achhalgach.md' },
    stats: {
      sutraCount: stats.sutras,
      prefaceCount: stats.prefaces,
      shlokaCount: stats.shlokas,
      translationCount: stats.translations,
      vidhiStepCount: stats.vidhiSteps,
      vidhiTranslationCount: stats.vidhiTranslations,
    },
  }
  await writeJson(path.join(OUT, 'index.json'), index)
  await writeJson(path.join(OUT, 'search-index.json'), { generatedAt: index.generatedAt, records: searchIndex })

  // Console summary (counts + what's missing).
  const fullyTranslated = []
  const partial = []
  const pending = []
  for (const id of allSutraIds) {
    const a = availability[id]
    const langsDone = LANGS.filter(
      (l) => a.shlokaCount > 0 && a.translatedShlokas[l] >= a.shlokaCount
    ).length
    if (a.needsVerseExtraction || a.shlokaCount === 0) pending.push(id)
    else if (langsDone === 3) fullyTranslated.push(id)
    else if (a.anyTranslated) partial.push(id)
    else pending.push(id)
  }
  log(`built ${stats.sutras} sutra bundles in ${Date.now() - started}ms`)
  log(`  prefaces: ${stats.prefaces}  shlokas: ${stats.shlokas}  per-shloka translations: ${stats.translations}`)
  log(`  vidhi steps: ${stats.vidhiSteps}  vidhi translations: ${stats.vidhiTranslations}`)
  log(`  fully translated (3 langs): ${fullyTranslated.length}  partial: ${partial.length}  pending: ${pending.length}`)
  log(`  search records: ${searchIndex.length}  pdfs: ${pdfs.length}  intro md: ${hasIntroMd ? 'yes' : 'no'}`)
  if (partial.length) log(`  partial: ${partial.join(', ')}`)
  log(`  → ${rel(OUT)}`)
  return true
}

async function copyPdfs() {
  const srcRoot = path.join(DATA, 'pdfs')
  const out = []
  async function walk(dir, base) {
    for (const ent of await listDir(dir)) {
      const abs = path.join(dir, ent.name)
      const relPath = base ? `${base}/${ent.name}` : ent.name
      if (ent.isDirectory()) await walk(abs, relPath)
      else if (ent.name.toLowerCase().endsWith('.pdf')) {
        const dest = path.join(OUT, 'pdfs', relPath)
        await fs.mkdir(path.dirname(dest), { recursive: true })
        await fs.copyFile(abs, dest)
        out.push(`pdfs/${relPath}`)
      }
    }
  }
  if (existsSync(srcRoot)) await walk(srcRoot, '')
  return out
}

/* -------------------------------------------------------------------- watch */

async function watch() {
  log('watch mode — initial sync…')
  await sync()
  let timer = null
  let busy = false
  const schedule = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(async () => {
      if (busy) return schedule()
      busy = true
      try {
        log('change detected — re-syncing…')
        await sync()
      } catch (e) {
        warn('re-sync failed:', e.message)
      } finally {
        busy = false
      }
    }, 350)
  }
  try {
    const { watch: fsWatch } = await import('node:fs')
    fsWatch(DATA, { recursive: true }, schedule)
    log(`watching ${rel(DATA)} … (Ctrl+C to stop)`)
  } catch (e) {
    warn('recursive watch unavailable on this platform:', e.message)
  }
}

/* --------------------------------------------------------------------- main */

const isWatch = process.argv.includes('--watch')
if (isWatch) {
  watch()
} else {
  sync()
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
