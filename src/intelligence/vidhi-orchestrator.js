// Vidhi & ādeśa extraction + translation orchestrator (DESIGN.md §15 open item #3).
//
// Sūtras already get a native canonical layer (canonical.json) and a per-(unit ×
// lang) translation layer. The book's *vidhi* (procedural connective text — the
// ādeśa call-and-response declarations and the "now recite X" directions) is
// spoken aloud just like the sūtras, but has never been pulled into structured,
// translatable data. This module adds the two missing layers, joined to the
// hand-curated structure tree by the vidhi-step `id`:
//
//   Phase A (extract)  : golden OCR pages -> data/corpus/vidhi.json
//                        (book-verbatim native segments; mirrors canonical.json)
//   Phase B (translate): vidhi.json -> data/translations/_vidhi/<vidhiId>.<lang>.json
//                        (idiomatic translation + short explanation per §13 policy)
//
// Principles mirror the sūtra pipeline: atomic Copilot call per unit, file-based
// state, scopeable, idempotent/resumable, book-verbatim (never fabricated). The
// deterministic golden-page slicing + assembly is pure code; only the
// segmentation/classification (extract) and the translation (translate) are
// Copilot calls.

import fs from "node:fs";
import path from "node:path";
import { invokeCopilotJson } from "../copilot.js";
import { logger } from "../utils/logger.js";

const EXTRACT_PROMPT_PATH = new URL("../../prompts/extract-vidhi.md", import.meta.url);
const TRANSLATE_PROMPT_PATH = new URL("../../prompts/translate-vidhi.md", import.meta.url);

const LANGS = {
    english:  { script: "latin" },
    gujarati: { script: "gujarati" },
    hindi:    { script: "devanagari" },
};

const VALID_KINDS = ["adesh", "direction", "formula"];

// ---------- shared helpers (copied from the sūtra pipeline; kept local so the
// sūtra orchestrator stays untouched) ----------
function fill(tpl, vars) {
    return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? String(vars[k]) : ""));
}

function loadTraditionKnowledge(config) {
    const p = path.join(config.dataDir, "tradition-knowledge", `${config.tradition || "achhalgach"}.md`);
    if (!fs.existsSync(p)) {
        logger.warn(`No tradition-knowledge file at ${p} — vidhi translations will lack ritual context`, "vidhi");
        return "(No tradition-knowledge document is available. Restrict claims about ritual position and tradition specifics to those visible in the inputs; do NOT invent placement.)";
    }
    return fs.readFileSync(p, "utf8");
}

// ---------- file paths ----------
function vidhiPath(config) {
    return path.join(config.dataDir, "corpus", "vidhi.json");
}

export function loadVidhi(config) {
    const p = vidhiPath(config);
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, "utf8")); }
    catch (e) { logger.warn(`Could not parse ${p}: ${e.message}`, "vidhi"); return null; }
}

function vidhiTransDir(config) {
    const dir = path.join(config.dataDir, "translations", "_vidhi");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function vidhiTransPath(config, vidhiId, lang) {
    // vidhiId is already filesystem-safe (kebab-case, no `/`).
    return path.join(vidhiTransDir(config), `${vidhiId}.${lang}.json`);
}

// ---------- deterministic golden-page slicing ----------
// bookPages: "21" | "54-55" | "19-20" | "21, 23"  ->  pdf page numbers (book - offset).
export function bookPagesToPdfPages(bookPages, pageOffset = 18) {
    const out = [];
    for (const part of String(bookPages || "").split(",")) {
        const seg = part.trim();
        const m = seg.match(/^(\d+)\s*-\s*(\d+)$/);
        if (m) { for (let b = +m[1]; b <= +m[2]; b++) out.push(b - pageOffset); }
        else if (/^\d+$/.test(seg)) out.push(+seg - pageOffset);
    }
    return out.filter(p => p >= 1);
}

// Read the verbatim golden text for a set of PDF pages, dropping ONLY the 3
// leading "# ..." comment-header lines so the model sees the full page prose
// (vidhi directions, ādeśa dialogue, surrounding sūtra headings, footnotes) —
// never normalized. This is the real golden text; the model must transcribe,
// not guess.
function loadGoldenPageText(dataDir, pdfPages) {
    const pagesDir = path.join(dataDir, "book", "pages");
    const chunks = [];
    for (const p of pdfPages) {
        const fp = path.join(pagesDir, `page-${String(p).padStart(3, "0")}.txt`);
        if (!fs.existsSync(fp)) { chunks.push(`----- (golden page pdf ${p} not found) -----`); continue; }
        const raw = fs.readFileSync(fp, "utf8");
        const body = raw.split(/\r?\n/).filter(l => {
            const t = l.trim();
            return !(t.startsWith("# page:") || t.startsWith("# book_page:") || t.startsWith("# header:"));
        }).join("\n").trim();
        chunks.push(`----- BOOK PAGE (pdf ${p}) -----\n${body}`);
    }
    return chunks.join("\n\n");
}

// ---------- structure-tree walk ----------
function describeStep(step, structure) {
    if (!step) return "(none)";
    if (step.type === "sutra") {
        const m = structure.sutras?.[step.sutraId] || {};
        return `sutra "${step.sutraId}" — ${m.name_native || ""} (${m.name_translit || ""})`;
    }
    if (step.type === "vidhi") return `vidhi "${step.id}" — ${step.summary_en || ""}`;
    return "(unknown step)";
}

// Enumerate every { type:"vidhi" } step across every pratikramaṇa sequence, with
// its derived pdf pages and its neighbouring sequence steps (so the model can
// resolve which sūtra a "now recite X" direction or an ādeśa introduces).
export function enumerateVidhiSteps(structure) {
    const pageOffset = structure.pageOffset ?? 18;
    const steps = [];
    for (const prat of structure.pratikramans || []) {
        const seq = prat.sequence || [];
        seq.forEach((step, i) => {
            if (step.type !== "vidhi") return;
            const bookPages = step.bookPages || "";
            steps.push({
                vidhiId: step.id,
                pratikraman: prat.id,
                summary_en: step.summary_en || "",
                bookPages,
                pdfPages: bookPagesToPdfPages(bookPages, pageOffset),
                avashyaka: step.avashyaka ?? null,
                prevStep: describeStep(seq[i - 1], structure),
                nextStep: describeStep(seq[i + 1], structure),
            });
        });
    }
    return steps;
}

function buildSutraRegistry(structure) {
    return Object.entries(structure.sutras || {})
        .map(([id, m]) => `${id}\t${m.name_native || ""}\t${m.name_translit || ""}\t${m.name_en || ""}`)
        .join("\n");
}

export function isVidhiScopeMatch(scope, step) {
    if (!scope || scope === "all") return true;
    if (scope === step.vidhiId) return true;
    if (scope === step.pratikraman) return true;
    return false;
}

// ---------- Phase A: native extraction ----------
async function extractOne({ step, goldenText, registry, config }) {
    const tpl = fs.readFileSync(EXTRACT_PROMPT_PATH, "utf8");
    const prompt = fill(tpl, {
        VIDHI_ID: step.vidhiId,
        PRATIKRAMAN: step.pratikraman,
        SUMMARY_EN: step.summary_en,
        BOOK_PAGES: step.bookPages,
        PDF_PAGES: step.pdfPages.join(", "),
        PREV_STEP: step.prevStep,
        NEXT_STEP: step.nextStep,
        GOLDEN_TEXT: goldenText,
        SUTRA_REGISTRY: registry,
    });
    const { data } = await invokeCopilotJson(prompt, {
        model: config.copilotModelLarge,
        markers: { start: "<<<VIDHI_START>>>", end: "<<<VIDHI_END>>>" },
        retries: 1,
    });
    return data;
}

function normSpeaker(kind, speaker) {
    if (kind === "direction") return null;                         // directions have no speaker
    if (speaker === "guru" || speaker === "shishya") return speaker;
    return "shishya";                                              // ādeśa request / spoken formula default
}

// Assemble the final vidhi.json step: deterministic identity fields from the
// structure tree, the model's segmentation normalized + grounded.
function assembleStep(step, data, sutraIds) {
    const rawSegs = Array.isArray(data?.segments) ? data.segments : [];
    const needsExtraction = data?.needsExtraction === true || rawSegs.length === 0;
    const segments = needsExtraction ? [] : rawSegs.map((s, i) => {
        const kind = VALID_KINDS.includes(s.kind) ? s.kind : "direction";
        let leadsToSutra = s.leadsToSutra || null;
        if (leadsToSutra && !sutraIds.has(leadsToSutra)) {
            logger.warn(`${step.vidhiId}: dropping unknown leadsToSutra '${leadsToSutra}'`, "vidhi");
            leadsToSutra = null;
        }
        return {
            segmentId: `${step.vidhiId}/${String(i + 1).padStart(2, "0")}`,
            kind,
            speaker: normSpeaker(kind, s.speaker),
            native_script: String(s.native_script || "").trim(),
            script: "gujarati",
            source_ids: ["book"],
            leadsToSutra,
        };
    });
    const out = {
        vidhiId: step.vidhiId,
        pratikraman: step.pratikraman,
        summary_en: step.summary_en,
        bookPages: step.bookPages,
        pdfPages: step.pdfPages,
        needsExtraction,
        segments,
    };
    if (data?.notes) out.notes = String(data.notes);
    return out;
}

export async function extractVidhiScope({ structure, scope, config, force = false, max = 0 }) {
    const allSteps = enumerateVidhiSteps(structure);
    const existing = loadVidhi(config);
    const byId = new Map((existing?.steps || []).map(s => [s.vidhiId, s]));
    const sutraIds = new Set(Object.keys(structure.sutras || {}));
    const registry = buildSutraRegistry(structure);

    // ---- Plan: which in-scope steps still need extracting ----
    const queue = [];
    let queued = 0;
    for (const step of allSteps) {
        if (!isVidhiScopeMatch(scope, step)) continue;
        if (!force && byId.has(step.vidhiId)) { logger.debug(`Skip (exists): vidhi ${step.vidhiId}`, "vidhi"); continue; }
        if (max > 0 && queued >= max) break;
        queued++;
        queue.push(step);
    }

    // ---- Extract (parallel under the copilot semaphore) ----
    if (queue.length) {
        const tasks = queue.map(step => (async () => {
            try {
                logger.info(`Extracting vidhi ${step.vidhiId} (book p.${step.bookPages})`, "vidhi");
                const goldenText = loadGoldenPageText(config.dataDir, step.pdfPages);
                const data = await extractOne({ step, goldenText, registry, config });
                byId.set(step.vidhiId, assembleStep(step, data, sutraIds));
                return { vidhiId: step.vidhiId, ok: true };
            } catch (e) {
                logger.error(`Vidhi extract failed ${step.vidhiId}: ${e.message}`, "vidhi");
                return { vidhiId: step.vidhiId, ok: false, error: e.message };
            }
        })());
        await Promise.all(tasks);
    } else {
        logger.info("No vidhi steps to extract (all exist; use --force to regenerate).", "vidhi");
    }

    // ---- Write the merged vidhi.json, ordered by the structure enumeration ----
    const orderIndex = new Map(allSteps.map((s, i) => [s.vidhiId, i]));
    const steps = [...byId.values()].sort(
        (a, b) => (orderIndex.get(a.vidhiId) ?? 1e9) - (orderIndex.get(b.vidhiId) ?? 1e9)
    );
    const vidhi = {
        tradition: structure.tradition || config.tradition || "achhalgach",
        source: "data/book/panch-pratikraman.full.md (golden OCR of the printed book)",
        generatedAt: new Date().toISOString(),
        steps,
    };
    const out = vidhiPath(config);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(vidhi, null, 2));
    const totalSegments = steps.reduce((a, s) => a + (s.segments?.length || 0), 0);
    logger.info(`Vidhi corpus written: ${out} — ${steps.length} steps, ${totalSegments} segments`, "vidhi");
    return { path: out, vidhi, extracted: queue.length, totalSegments };
}

// ---------- Phase B: translation ----------
async function translateVidhiOne({ step, lang, config, traditionKnowledge }) {
    const tpl = fs.readFileSync(TRANSLATE_PROMPT_PATH, "utf8");
    const segmentsJson = JSON.stringify(step.segments.map(s => ({
        segmentId: s.segmentId,
        kind: s.kind,
        speaker: s.speaker,
        native_script: s.native_script,
        leadsToSutra: s.leadsToSutra ?? null,
    })), null, 2);
    const prompt = fill(tpl, {
        VIDHI_ID: step.vidhiId,
        PRATIKRAMAN: step.pratikraman,
        SUMMARY_EN: step.summary_en,
        SEGMENT_COUNT: step.segments.length,
        SEGMENTS_JSON: segmentsJson,
        TARGET_LANG: lang,
        TARGET_SCRIPT: LANGS[lang].script,
        TRADITION_KNOWLEDGE: traditionKnowledge,
    });
    const { data } = await invokeCopilotJson(prompt, {
        model: config.copilotModelLarge,
        markers: { start: "<<<VIDHI_TR_START>>>", end: "<<<VIDHI_TR_END>>>" },
        retries: 1,
    });
    return data;
}

// Normalize the model output to the §3.2 schema and enforce 1:1 segment
// alignment with the native segments (segmentId + order are authoritative from
// vidhi.json, never the model).
function normalizeVidhiTranslation(step, lang, data) {
    const inSegs = Array.isArray(data?.segments) ? data.segments : [];
    if (inSegs.length !== step.segments.length) {
        logger.warn(`${step.vidhiId} [${lang}]: model returned ${inSegs.length} segments, expected ${step.segments.length} — realigning by position`, "vidhi");
    }
    const segments = step.segments.map((ns, i) => {
        const t = inSegs[i] || {};
        const ritualTerms = Array.isArray(t.ritualTerms)
            ? t.ritualTerms.filter(x => x && x.term).map(x => ({ term: String(x.term), gloss: String(x.gloss || "") }))
            : [];
        return {
            segmentId: ns.segmentId,
            recitation: String(t.recitation || ""),
            plainMeaning: String(t.plainMeaning || ""),
            idiomaticTranslation: String(t.idiomaticTranslation || ""),
            explanation: String(t.explanation || ""),
            ritualTerms,
        };
    });
    return {
        vidhiId: step.vidhiId,
        targetLang: lang,
        targetScript: LANGS[lang].script,
        title: String(data?.title || ""),
        summary: String(data?.summary || ""),
        segments,
        sources: Array.isArray(data?.sources) ? data.sources : [],
        translatorConfidence: typeof data?.translatorConfidence === "number" ? data.translatorConfidence : 0,
        notes: String(data?.notes || ""),
    };
}

export async function translateVidhiScope({ structure, vidhi, scope, langs, config, force = false, max = 0 }) {
    void structure; // accepted for signature parity with the sūtra pipeline
    const traditionKnowledge = loadTraditionKnowledge(config);
    const steps = (vidhi?.steps || []).filter(s => isVidhiScopeMatch(scope, s));

    // ---- Plan: which (step × lang) units still need translating ----
    const queue = [];
    let stepsQueued = 0;
    for (const step of steps) {
        if (step.needsExtraction || !Array.isArray(step.segments) || step.segments.length === 0) {
            logger.debug(`Skip (no segments): vidhi ${step.vidhiId}`, "vidhi");
            continue;
        }
        if (max > 0 && stepsQueued >= max) break;
        let any = false;
        for (const lang of langs) {
            const outPath = vidhiTransPath(config, step.vidhiId, lang);
            if (!force && fs.existsSync(outPath)) { logger.debug(`Skip (exists): vidhi ${step.vidhiId} [${lang}]`, "vidhi"); continue; }
            queue.push({ step, lang, outPath });
            any = true;
        }
        if (any) stepsQueued++;
    }

    if (queue.length === 0) {
        logger.info("Nothing to translate for vidhi (all exist; use --force to regenerate).", "vidhi");
        return [];
    }

    // ---- Translate (parallel under the copilot semaphore) ----
    const tasks = queue.map(({ step, lang, outPath }) => (async () => {
        try {
            logger.info(`Translating vidhi ${step.vidhiId} [${lang}]`, "vidhi");
            const data = await translateVidhiOne({ step, lang, config, traditionKnowledge });
            fs.writeFileSync(outPath, JSON.stringify(normalizeVidhiTranslation(step, lang, data), null, 2));
            return { vidhiId: step.vidhiId, lang, ok: true, path: outPath };
        } catch (e) {
            logger.error(`Vidhi translate failed ${step.vidhiId} [${lang}]: ${e.message}`, "vidhi");
            return { vidhiId: step.vidhiId, lang, ok: false, error: e.message };
        }
    })());

    const results = await Promise.all(tasks);
    const ok = results.filter(r => r.ok).length;
    logger.info(`Vidhi translation pass complete: ${ok}/${results.length} succeeded`, "vidhi");
    return results;
}
