// Deterministic canonical-corpus builder (replaces the old multi-source Copilot
// reconciler). The single golden source is the scanned book: the recitation
// order + sutra registry come from data/corpus/pratikraman-structure.json, and
// each sutra's verses are extracted verbatim from the golden OCR pages
// (data/book/pages/page-NNN.txt) by src/corpus/book-parser.js.
//
// Output: data/corpus/canonical.json — same schema the translation pipeline
// already consumes (sutras[].shlokas[].native_script, etc.).

import fs from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger.js";
import { extractSutraVerses } from "./book-parser.js";
import { shlokaId as mkShlokaId } from "../utils/slug.js";

// Distinctive Gujarati heading substrings used to locate each sutra's section
// inside its golden page range. Sutras absent here (prose/vidhi-only) are still
// emitted, with empty shlokas and needsVerseExtraction=true.
const HEADING_NEEDLES = {
    navkar: ["નવકાર મહામંત્ર"],
    panchindiya: ["પંચિંદિય"],
    iriyavahiyam: ["ઇરિયાવહિયં"],
    "tassa-uttari": ["તસ્સ"],
    annattha: ["અન્નત્થ"],
    logassa: ["લોગસ્સ સૂત્ર"],
    gamanagamano: ["ગમણાગમણો"],
    jivrashi: ["જીવરાશિ"],
    "adhar-papsthanak": ["અઢાર પાપસ્થાનક"],
    "karemi-bhante": ["કરેમિ ભંતે"],
    "suguru-dwadashavarta-vandana": ["વાંદણા સૂત્ર"],
    "drumapushpika-sajjhay": ["દ્રુમપુષ્પિકા"],
    "panch-parmeshthi-sajjhay": ["પંચ પરમેષ્ઠિની"],
    "mannaha-jinanam-sajjhay": ["મન્નહ જિણાણં"],
    "bharahesar-sajjhay": ["ભરહેસરની"],
    "ashtottari-tirthmala": ["અષ્ટોત્તરી તીર્થમાલા", "અષ્ટોત્તરી તીર્થમાળા"],
    "nandisutrani-pratham-sajay": ["નંદીસૂત્રની પ્રથમ"],
    "nandisutrani-dvitiya-sajay": ["નંદીસૂત્રની દ્વિતીય"],
    "smaran-2-ajitshanti": ["અજિતશાંતિસ્તવ દ્વિતીય"],
    "smaran-5-namiun-bhayahar": ["નમિઊણ ભયહર"],
    "smaran-8-laghu-ajitshanti": ["લઘુ અજિતશાંતિસ્તવ અષ્ટમ"],
    "smaran-9-bruhad-ajitshanti": ["બૃહદ્ અજિતશાંતિ"],
    "deshavagasik-pachchakkhan": ["દેશાવગાશિક વ્રતનું પચ્ચખ્ખાણ"],
    "deshavagasik-samayik-pachchakkhan": ["દેશાવગાશિક સામાયિક વ્રતનું પચ્ચખ્ખાણ"],
};

export function loadStructure(config) {
    const p = path.join(config.dataDir, "corpus", "pratikraman-structure.json");
    if (!fs.existsSync(p)) throw new Error(`Missing structure tree: ${p} (build it from the golden book first).`);
    return JSON.parse(fs.readFileSync(p, "utf8"));
}

// Canonical order = first appearance of each unique sutra across the pratikraman
// sequences (in pratikraman order), then any appendix sutras.
function canonicalSutraOrder(structure) {
    const seen = new Set();
    const order = [];
    for (const prat of structure.pratikramans) {
        for (const step of (prat.sequence || [])) {
            if (step.type === "sutra" && !seen.has(step.sutraId)) { seen.add(step.sutraId); order.push(step.sutraId); }
        }
    }
    for (const item of (structure.appendix?.items || [])) {
        for (const sid of (item.sutras || [])) if (!seen.has(sid)) { seen.add(sid); order.push(sid); }
    }
    // Any registry sutra not yet placed (e.g. only referenced indirectly) goes last.
    for (const sid of Object.keys(structure.sutras)) if (!seen.has(sid)) { seen.add(sid); order.push(sid); }
    return order;
}

export function buildCanonical(config) {
    const structure = loadStructure(config);
    const order = canonicalSutraOrder(structure);
    const sutras = [];
    let withVerses = 0, totalShlokas = 0;

    order.forEach((sutraId, idx) => {
        const meta = structure.sutras[sutraId];
        if (!meta) { logger.warn(`Structure references unknown sutra '${sutraId}'`, "build-corpus"); return; }
        const needles = HEADING_NEEDLES[sutraId] || [meta.name_native];
        let verses = [];
        try {
            const res = extractSutraVerses(config.dataDir, meta.pdfPages || [], needles);
            verses = res.verses;
        } catch (e) {
            logger.warn(`Verse extraction failed for ${sutraId}: ${e.message}`, "build-corpus");
        }
        const hasVerses = verses.length > 0;
        if (hasVerses) withVerses++;
        totalShlokas += verses.length;

        sutras.push({
            sutraId,
            name_native: meta.name_native,
            name_translit: meta.name_translit || "",
            name_en: meta.name_en || "",
            aliases: meta.aliases || [],
            order: idx + 1,
            kind: meta.kind || "sutra",
            script: "gujarati",
            bookPages: meta.bookPages || "",
            pdfPages: meta.pdfPages || [],
            usedIn: meta.usedIn || [],
            role: meta.role || "",
            ...(hasVerses ? {} : { needsVerseExtraction: true }),
            shlokas: verses.map((v, i) => ({
                // Sequential 1..N within the sutra guarantees a unique shlokaId even when
                // the book restarts verse numbering per sub-section (e.g. the multi-dhala
                // chaityavandan, or vandana + pattaavali). The book's printed number is
                // kept as `printedNumber` for display.
                shlokaId: mkShlokaId(sutraId, i + 1),
                number: i + 1,
                printedNumber: v.number,
                native_script: v.text,
                script: "gujarati",
                source_ids: ["book"],
                reconcile_confidence: 1.0,
            })),
        });
    });

    const canonical = {
        tradition: structure.tradition || config.tradition || "achhalgach",
        source: "data/book/panch-pratikraman.full.md (golden OCR of the printed book)",
        generatedAt: new Date().toISOString(),
        sutras,
        globalNotes: `Built deterministically from data/corpus/pratikraman-structure.json + the golden OCR pages by src/corpus/canonical-builder.js. ${withVerses}/${sutras.length} sutras have extracted verses (${totalShlokas} shlokas total). Sutras flagged needsVerseExtraction are prose/vidhi-heavy or pending a heading needle.`,
    };

    const out = path.join(config.dataDir, "corpus", "canonical.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(canonical, null, 2));
    logger.info(`Canonical corpus written: ${out} — ${sutras.length} sutras, ${totalShlokas} shlokas, ${withVerses} with verses`, "build-corpus");
    return { path: out, canonical, stats: { sutras: sutras.length, withVerses, totalShlokas } };
}

export function loadCanonical(config) {
    const p = path.join(config.dataDir, "corpus", "canonical.json");
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8"));
}
