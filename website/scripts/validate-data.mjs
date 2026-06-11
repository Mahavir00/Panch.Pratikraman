#!/usr/bin/env node
// @ts-check
/**
 * validate-data.mjs — assert the synced public bundle is internally consistent
 * and safe for the app to consume. Run AFTER `npm run sync-data`.
 *
 * Checks (docs/WEBSITE-BUILD-PROMPT.md §5):
 *   1. Referential integrity of the structure tree (sequences / appendix / avashyakas)
 *      and that empty-sequence pratikramans declare basedOn + overrides.
 *   2. Every sutra/<id>.json parses; non-needsVerseExtraction shlokas have native_script;
 *      present per-shloka translations & prefaces carry their required fields.
 *   3. Script spot-check: Gujarati/Hindi recitation+plain-meaning are >= 85% target-script;
 *      English recitation is Latin/IAST.
 *   4. No referenced route target is missing from the bundle.
 *
 * Exit code 0 = pass, 1 = one or more errors.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'public', 'data')
const LANGS = ['english', 'gujarati', 'hindi']
const THRESHOLD = 0.85

const errors = []
const warnings = []
const err = (m) => errors.push(m)
const warn = (m) => warnings.push(m)

async function readJson(p) {
  try {
    return JSON.parse(await fs.readFile(p, 'utf8'))
  } catch (e) {
    return null
  }
}

/* --------------------------------------------------- script-ratio utilities */

function ratioInRange(str, lo, hi, extra = []) {
  let letters = 0
  let inRange = 0
  for (const ch of str) {
    const cp = ch.codePointAt(0)
    if (cp == null) continue
    const isLetter = /\p{L}|\p{M}/u.test(ch)
    if (!isLetter) continue
    letters++
    if ((cp >= lo && cp <= hi) || extra.some(([a, b]) => cp >= a && cp <= b)) inRange++
  }
  return letters < 10 ? 1 : inRange / letters
}

const gujaratiRatio = (s) => ratioInRange(s, 0x0a80, 0x0aff)
const devanagariRatio = (s) => ratioInRange(s, 0x0900, 0x097f)
// Latin incl. diacritics & combining marks (IAST).
const latinRatio = (s) =>
  ratioInRange(s, 0x0041, 0x024f, [
    [0x0300, 0x036f],
    [0x1e00, 0x1eff],
  ])

function checkScript(lang, field, text, where) {
  if (!text || typeof text !== 'string') return
  let r = 1
  if (lang === 'gujarati') r = gujaratiRatio(text)
  else if (lang === 'hindi') r = devanagariRatio(text)
  else if (lang === 'english' && field === 'recitation') r = latinRatio(text)
  else return
  if (r < THRESHOLD) {
    warn(`script: ${where} ${lang}.${field} only ${(r * 100).toFixed(0)}% target-script`)
  }
}

/* --------------------------------------------------------------- the checks */

async function main() {
  const index = await readJson(path.join(OUT, 'index.json'))
  if (!index) {
    err('public/data/index.json is missing or invalid. Run `npm run sync-data` first.')
    return report()
  }

  const sutras = index.sutras || {}
  const sutraIds = new Set(Object.keys(sutras))

  // ---- Check 1: structure referential integrity --------------------------
  const referenced = new Set()
  for (const p of index.pratikramans || []) {
    const seq = Array.isArray(p.sequence) ? p.sequence : []
    for (const step of seq) {
      if (step.type === 'sutra') {
        referenced.add(step.sutraId)
        if (!sutraIds.has(step.sutraId))
          err(`pratikraman "${p.id}" references unknown sutra "${step.sutraId}"`)
      }
    }
    if (seq.length === 0) {
      if (!p.basedOn) err(`pratikraman "${p.id}" has empty sequence but no basedOn`)
      if (!p.overrides || !p.overrides.wordSubstitution || !p.overrides.kausagga)
        err(`pratikraman "${p.id}" has empty sequence but incomplete overrides`)
      if (p.basedOn && !(index.pratikramans || []).some((x) => x.id === p.basedOn))
        err(`pratikraman "${p.id}" basedOn unknown pratikraman "${p.basedOn}"`)
    }
  }
  for (const item of index.appendix?.items || [])
    for (const sid of item.sutras || []) {
      referenced.add(sid)
      if (!sutraIds.has(sid)) err(`appendix item "${item.id}" references unknown sutra "${sid}"`)
    }
  for (const av of index.avashyakas || [])
    for (const sid of av.anchorSutras || []) {
      referenced.add(sid)
      if (!sutraIds.has(sid)) err(`avashyaka ${av.no} anchorSutra "${sid}" not in registry`)
    }

  // ---- Check 2 + 3: per-sutra bundle integrity + script -----------------
  let bundleCount = 0
  for (const sutraId of sutraIds) {
    const bundle = await readJson(path.join(OUT, 'sutra', `${sutraId}.json`))
    if (!bundle) {
      err(`sutra bundle missing/invalid: sutra/${sutraId}.json`)
      continue
    }
    bundleCount++

    for (const lang of LANGS) {
      const pf = bundle.prefaces?.[lang]
      if (pf) {
        for (const reqd of ['title', 'summary'])
          if (!pf[reqd]) warn(`preface ${sutraId}.${lang} missing "${reqd}"`)
      }
    }

    for (const sh of bundle.shlokas || []) {
      if (!bundle.needsVerseExtraction && (!sh.native_script || !sh.native_script.trim()))
        err(`shloka ${sh.shlokaId} has empty native_script (not flagged needsVerseExtraction)`)
      for (const lang of LANGS) {
        const tr = sh.translations?.[lang]
        if (!tr) continue
        for (const reqd of ['plainMeaning', 'recitation'])
          if (!tr[reqd]) warn(`translation ${sh.shlokaId}.${lang} missing "${reqd}"`)
        if (!Array.isArray(tr.wordByWord))
          warn(`translation ${sh.shlokaId}.${lang} has no wordByWord array`)
        checkScript(lang, 'recitation', tr.recitation, sh.shlokaId)
        checkScript(lang, 'plainMeaning', tr.plainMeaning, sh.shlokaId)
      }
    }
  }

  // ---- Check 4: route targets resolvable --------------------------------
  const glossary = await readJson(path.join(OUT, 'glossary.json'))
  if (!glossary) err('glossary.json missing/invalid')
  else for (const lang of LANGS) if (!glossary.languages?.[lang]) warn(`glossary missing language "${lang}"`)

  const search = await readJson(path.join(OUT, 'search-index.json'))
  if (!search) err('search-index.json missing/invalid')
  else
    for (const rec of search.records || [])
      if ((rec.type === 'sutra' || rec.type === 'shloka') && rec.sutraId && !sutraIds.has(rec.sutraId))
        err(`search record "${rec.id}" points to unknown sutra "${rec.sutraId}"`)

  // Every pratikraman route resolves (id present + either a sequence or a base).
  for (const p of index.pratikramans || [])
    if (!p.id) err('a pratikraman has no id')

  // ---- Check 5: vidhi / ādeśa layer ------------------------------------
  const vidhi = await readJson(path.join(OUT, 'vidhi.json'))
  let vidhiStepCount = 0
  if (vidhi) {
    const steps = vidhi.steps || {}
    // Every vidhi step referenced by the structure tree should have an entry.
    for (const p of index.pratikramans || [])
      for (const step of p.sequence || [])
        if (step.type === 'vidhi' && !steps[step.id])
          warn(`vidhi step "${step.id}" (in ${p.id}) has no entry in vidhi.json`)

    for (const [vidhiId, vs] of Object.entries(steps)) {
      vidhiStepCount++
      if (!vs.needsExtraction && (!Array.isArray(vs.segments) || vs.segments.length === 0))
        err(`vidhi "${vidhiId}" not flagged needsExtraction but has no segments`)
      for (const seg of vs.segments || []) {
        if (!seg.native_script || !seg.native_script.trim())
          err(`vidhi segment ${seg.segmentId} has empty native_script`)
        if (!['adesh', 'direction', 'formula'].includes(seg.kind))
          err(`vidhi segment ${seg.segmentId} has invalid kind "${seg.kind}"`)
        if (seg.leadsToSutra && !sutraIds.has(seg.leadsToSutra))
          err(`vidhi segment ${seg.segmentId} leadsToSutra unknown "${seg.leadsToSutra}"`)
        checkScript('gujarati', 'native', seg.native_script, seg.segmentId)
      }
      // Translation alignment: present per-lang segments map 1:1 to native segments.
      const nativeIds = new Set((vs.segments || []).map((s) => s.segmentId))
      for (const lang of LANGS) {
        const tr = vs.translations?.[lang]
        if (!tr) continue
        for (const segTr of tr.segments || [])
          if (!nativeIds.has(segTr.segmentId))
            err(`vidhi ${vidhiId}.${lang} segment "${segTr.segmentId}" not in native segments`)
        for (const segTr of tr.segments || []) {
          checkScript(lang, 'recitation', segTr.recitation, segTr.segmentId)
          checkScript(lang, 'plainMeaning', segTr.plainMeaning, segTr.segmentId)
        }
      }
    }
  } else {
    warn('vidhi.json missing — vidhi/ādeśa detail will not render (run sync-data)')
  }

  // Search records for vidhi resolve to a known pratikraman.
  for (const rec of search?.records || [])
    if (rec.type === 'vidhi' && rec.pratikraman && !(index.pratikramans || []).some((p) => p.id === rec.pratikraman))
      err(`search record "${rec.id}" points to unknown pratikraman "${rec.pratikraman}"`)

  console.log(
    `[validate] sutras=${sutraIds.size} bundles=${bundleCount} referenced=${referenced.size} ` +
      `vidhiSteps=${vidhiStepCount} ` +
      `glossaryLangs=${glossary ? Object.keys(glossary.languages || {}).length : 0} ` +
      `searchRecords=${search?.records?.length ?? 0}`
  )
  return report()
}

function report() {
  for (const w of warnings) console.warn('  ⚠', w)
  if (errors.length) {
    for (const e of errors) console.error('  ✗', e)
    console.error(`\n[validate] FAILED — ${errors.length} error(s), ${warnings.length} warning(s).`)
    process.exit(1)
  }
  console.log(`\n[validate] PASSED — 0 errors, ${warnings.length} warning(s).`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
