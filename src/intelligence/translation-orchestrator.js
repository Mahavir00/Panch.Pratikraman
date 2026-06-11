import fs from "node:fs";
import path from "node:path";
import { invokeCopilotJson } from "../copilot.js";
import { logger } from "../utils/logger.js";
import { shlokaFileBase } from "../utils/slug.js";

const PROMPT_PATH = new URL("../../prompts/translate-elaborate.md", import.meta.url);
const PREFACE_PROMPT_PATH = new URL("../../prompts/sutra-preface.md", import.meta.url);

const LANGS = {
    english:  { script: "latin" },
    gujarati: { script: "gujarati" },
    hindi:    { script: "devanagari" },
};

function fill(tpl, vars) {
    return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? String(vars[k]) : ""));
}

function loadTraditionKnowledge(config) {
    const p = path.join(config.dataDir, "tradition-knowledge", `${config.tradition || "achhalgach"}.md`);
    if (!fs.existsSync(p)) {
        logger.warn(`No tradition-knowledge file at ${p} — translations will lack ritual context`, "translate");
        return "(No tradition-knowledge document is available. Restrict claims about ritual position and tradition specifics to those visible in the inputs; do NOT invent placement.)";
    }
    return fs.readFileSync(p, "utf8");
}

function sutraDir(config, sutraId) {
    const dir = path.join(config.dataDir, "translations", sutraId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function translationPath(config, sutraId, shlokaId, lang) {
    return path.join(sutraDir(config, sutraId), `${shlokaFileBase(shlokaId)}.${lang}.json`);
}

function prefacePath(config, sutraId, lang) {
    return path.join(sutraDir(config, sutraId), `_preface.${lang}.json`);
}

// ---------- Sutra preface (the write-once, sutra-level framing) ----------
async function generatePreface({ sutra, lang, config, traditionKnowledge }) {
    const tpl = fs.readFileSync(PREFACE_PROMPT_PATH, "utf8");
    const allVerses = (sutra.shlokas || [])
        .map(s => `(${s.printedNumber ?? s.number})\n${s.native_script || ""}`)
        .join("\n\n");
    const prompt = fill(tpl, {
        SUTRA_ID: sutra.sutraId,
        SUTRA_ORDER: sutra.order,
        SUTRA_NAME_NATIVE: sutra.name_native || "",
        SUTRA_NAME_EN: sutra.name_en || "",
        SUTRA_ROLE: sutra.role || "(unspecified)",
        SUTRA_KIND: sutra.kind || "sutra",
        SUTRA_USEDIN: Array.isArray(sutra.usedIn) ? sutra.usedIn.join(", ") : "",
        SHLOKA_COUNT: (sutra.shlokas || []).length,
        ALL_VERSES: allVerses,
        TARGET_LANG: lang,
        TARGET_SCRIPT: LANGS[lang].script,
        TRADITION_KNOWLEDGE: traditionKnowledge,
    });
    const { data } = await invokeCopilotJson(prompt, {
        model: config.copilotModelLarge,
        markers: { start: "<<<PREFACE_START>>>", end: "<<<PREFACE_END>>>" },
        retries: 1,
    });
    return data;
}

// Ensure the preface exists for (sutra × lang); returns the parsed preface object.
async function ensurePreface({ sutra, lang, config, traditionKnowledge, force }) {
    const out = prefacePath(config, sutra.sutraId, lang);
    if (!force && fs.existsSync(out)) {
        try { return JSON.parse(fs.readFileSync(out, "utf8")); }
        catch { /* fall through and regenerate */ }
    }
    logger.info(`Preface ${sutra.sutraId} [${lang}]`, "translate");
    const data = await generatePreface({ sutra, lang, config, traditionKnowledge });
    fs.writeFileSync(out, JSON.stringify(data, null, 2));
    return data;
}

// ---------- Per-shloka translation ----------
async function translateOne({ sutra, shloka, prev, next, lang, config, traditionKnowledge, preface }) {
    const tpl = fs.readFileSync(PROMPT_PATH, "utf8");
    const glossaryTerms = (preface?.glossary || [])
        .map(g => `${g.term}${g.scriptForm ? ` (${g.scriptForm})` : ""}`)
        .join("; ") || "(none)";
    const prompt = fill(tpl, {
        SUTRA_ID: sutra.sutraId,
        SUTRA_ORDER: sutra.order,
        SUTRA_NAME_NATIVE: sutra.name_native || "",
        SUTRA_NAME_EN: sutra.name_en || "",
        SHLOKA_ID: shloka.shlokaId,
        SHLOKA_NUMBER: shloka.printedNumber ?? shloka.number,
        SHLOKA_SCRIPT: shloka.script || "",
        SHLOKA_NATIVE: shloka.native_script || "",
        PRECEDING_SHLOKA: prev?.native_script || "",
        FOLLOWING_SHLOKA: next?.native_script || "",
        PREFACE_JSON: preface ? JSON.stringify(preface, null, 2) : "(no preface available)",
        GLOSSARY_TERMS: glossaryTerms,
        TARGET_LANG: lang,
        TARGET_SCRIPT: LANGS[lang].script,
        TRADITION_KNOWLEDGE: traditionKnowledge,
    });
    const { data } = await invokeCopilotJson(prompt, {
        model: config.copilotModelLarge,
        markers: { start: "<<<TRANSLATION_START>>>", end: "<<<TRANSLATION_END>>>" },
        retries: 1,
    });
    return data;
}

export function isScopeMatch(scope, sutra, shloka) {
    if (!scope || scope === "all") return true;
    if (scope === sutra.sutraId) return true;
    if (scope === shloka.shlokaId) return true;
    return false;
}

// ---------- Glossary merge (per-sutra prefaces -> shared corpus glossary) ----------
export function mergeGlossaries(config, langs) {
    const tDir = path.join(config.dataDir, "translations");
    if (!fs.existsSync(tDir)) return;
    const outDir = path.join(config.dataDir, "glossary");
    fs.mkdirSync(outDir, { recursive: true });
    for (const lang of langs) {
        const byTerm = new Map();
        for (const sutraId of fs.readdirSync(tDir)) {
            const pf = prefacePath(config, sutraId, lang);
            if (!fs.existsSync(pf)) continue;
            let preface;
            try { preface = JSON.parse(fs.readFileSync(pf, "utf8")); } catch { continue; }
            for (const g of (preface.glossary || [])) {
                if (!g.term) continue;
                const key = g.term.trim().toLowerCase();
                const existing = byTerm.get(key);
                if (!existing) {
                    byTerm.set(key, { term: g.term, scriptForm: g.scriptForm || "", definition: g.definition || "", sutras: [sutraId] });
                } else {
                    if (!existing.sutras.includes(sutraId)) existing.sutras.push(sutraId);
                    if ((g.definition || "").length > (existing.definition || "").length) existing.definition = g.definition;
                    if (!existing.scriptForm && g.scriptForm) existing.scriptForm = g.scriptForm;
                }
            }
        }
        const terms = [...byTerm.values()].sort((a, b) => a.term.localeCompare(b.term));
        const out = path.join(outDir, `${lang}.json`);
        fs.writeFileSync(out, JSON.stringify({ lang, generatedAt: new Date().toISOString(), terms }, null, 2));
        logger.info(`Glossary [${lang}]: ${terms.length} terms -> ${out}`, "translate");
    }
}

export async function translateScope({ canonical, scope, langs, config, force = false, max = 0 }) {
    const traditionKnowledge = loadTraditionKnowledge(config);

    // ---- Phase 1: decide what to translate, and which (sutra × lang) prefaces are needed ----
    const queue = [];                  // { sutra, shloka, prev, next, lang, outPath }
    const prefacesNeeded = new Map();  // sutraId -> { sutra, langs:Set }
    let queued = 0;

    for (const sutra of canonical.sutras) {
        for (let i = 0; i < sutra.shlokas.length; i++) {
            const shloka = sutra.shlokas[i];
            if (!isScopeMatch(scope, sutra, shloka)) continue;
            const prev = sutra.shlokas[i - 1];
            const next = sutra.shlokas[i + 1];
            for (const lang of langs) {
                if (max > 0 && queued >= max * langs.length) break;
                const outPath = translationPath(config, sutra.sutraId, shloka.shlokaId, lang);
                if (!force && fs.existsSync(outPath)) {
                    logger.debug(`Skip (exists): ${shloka.shlokaId} [${lang}]`, "translate");
                    continue;
                }
                queued++;
                queue.push({ sutra, shloka, prev, next, lang, outPath });
                if (!prefacesNeeded.has(sutra.sutraId)) prefacesNeeded.set(sutra.sutraId, { sutra, langs: new Set() });
                prefacesNeeded.get(sutra.sutraId).langs.add(lang);
            }
        }
    }

    if (queue.length === 0) {
        logger.info("Nothing to translate (all exist; use --force to regenerate).", "translate");
        return [];
    }

    // ---- Phase 2: ensure all needed prefaces (parallel under the copilot semaphore) ----
    const prefaces = {};  // sutraId -> { lang -> preface }
    const prefaceTasks = [];
    for (const { sutra, langs: ls } of prefacesNeeded.values()) {
        prefaces[sutra.sutraId] = {};
        for (const lang of ls) {
            prefaceTasks.push((async () => {
                try {
                    prefaces[sutra.sutraId][lang] = await ensurePreface({ sutra, lang, config, traditionKnowledge, force });
                } catch (e) {
                    logger.error(`Preface failed ${sutra.sutraId} [${lang}]: ${e.message}`, "translate");
                    prefaces[sutra.sutraId][lang] = null;
                }
            })());
        }
    }
    await Promise.all(prefaceTasks);

    // ---- Phase 3: per-shloka translations (parallel under the copilot semaphore) ----
    const tasks = queue.map(({ sutra, shloka, prev, next, lang, outPath }) => (async () => {
        try {
            logger.info(`Translating ${shloka.shlokaId} [${lang}]`, "translate");
            const preface = prefaces[sutra.sutraId]?.[lang] || null;
            const data = await translateOne({ sutra, shloka, prev, next, lang, config, traditionKnowledge, preface });
            fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
            return { shlokaId: shloka.shlokaId, lang, ok: true, path: outPath };
        } catch (e) {
            logger.error(`Failed ${shloka.shlokaId} [${lang}]: ${e.message}`, "translate");
            return { shlokaId: shloka.shlokaId, lang, ok: false, error: e.message };
        }
    })());

    const results = await Promise.all(tasks);
    const ok = results.filter(r => r.ok).length;

    // ---- Phase 4: refresh the shared glossary from the prefaces ----
    try { mergeGlossaries(config, langs); } catch (e) { logger.warn(`Glossary merge failed: ${e.message}`, "translate"); }

    logger.info(`Translation pass complete: ${ok}/${results.length} succeeded`, "translate");
    return results;
}
