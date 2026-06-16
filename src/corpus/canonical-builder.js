// Deterministic canonical-corpus builder (replaces the old multi-source Copilot
// reconciler). The single golden source is the source book: the recitation
// order + sutra registry come from data/corpus/pratikraman-structure.json, and
// each sutra's verses are extracted verbatim from the golden OCR pages
// (data/book/pages/page-NNN.txt) by src/corpus/book-parser.js.
//
// Output: data/corpus/canonical.json — same schema the translation pipeline
// already consumes (sutras[].shlokas[].native_script, etc.).

import fs from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger.js";
import { extractSutraVerses, bodyToSingleBlock, extractMonotonicVowVerses } from "./book-parser.js";
import { shlokaId as mkShlokaId } from "../utils/slug.js";

// Distinctive Gujarati heading substrings used to locate each sutra's section
// inside its golden page range. Sutras absent here (prose/vidhi-only) are still
// emitted, with empty shlokas and needsVerseExtraction=true.
const HEADING_NEEDLES = {
    navkar: ["નવકાર મહામંત્ર"],
    panchindiya: ["પંચિંદિય"],
    iriyavahiyam: ["ઇરિયાવહિયં"],
    "tassa-uttari": ["તસ્સ ઉત્તરી", "તસ્સ (ઉત્તરી"],
    annattha: ["અન્નત્થ"],
    logassa: ["લોગસ્સ સૂત્ર"],
    gamanagamano: ["ગમણાગમણો"],
    jivrashi: ["જીવરાશિ"],
    "adhar-papsthanak": ["અઢાર પાપસ્થાનક"],
    "dravya-kshetra-kaal-bhav": ["દ્રવ્ય ક્ષેત્ર કાલ ભાવ"],
    "karemi-bhante": ["કરેમિ ભંતે"],
    padilehana: ["પડિલેહણ", "બોલ"],
    "suguru-dwadashavarta-vandana": ["વાંદણા સૂત્ર"],
    "drumapushpika-sajjhay": ["દ્રુમપુષ્પિકા"],
    "panch-parmeshthi-sajjhay": ["પંચ પરમેષ્ઠિની"],
    "mannaha-jinanam-sajjhay": ["મન્નહ જિણાણં આણં"],
    "samayik-parvani": ["સામાયિક પારવાનું સૂત્ર", "સામાયિક પારવાની ગાથા"],
    "bharahesar-sajjhay": ["ભરહેસરની"],
    "rai-mangalacharan": ["મંગલં ભગવાન વીરો"],
    "ashtottari-tirthmala": ["અષ્ટોત્તરી તીર્થમાલા", "અષ્ટોત્તરી તીર્થમાળા"],
    "nandisutrani-pratham-sajay": ["નંદીસૂત્રની પ્રથમ"],
    "nandisutrani-dvitiya-sajay": ["નંદીસૂત્રની દ્વિતીય"],
    "smaran-1-bruhannamaskar": ["બૃહન્નમસ્કાર"],
    "smaran-2-ajitshanti": ["અજિતશાંતિસ્તવ દ્વિતીય"],
    "smaran-3-virstava": ["વીરસ્તવ"],
    "smaran-4-upasargahar": ["ઉપસર્ગહર"],
    "smaran-5-namiun-bhayahar": ["નમિઊણ ભયહર"],
    "smaran-6-jirapalli-parshva": ["જીરાપલ્લી"],
    "smaran-7-shakrastava": ["શકસ્તવ", "શક્રસ્તવ"],
    "smaran-8-laghu-ajitshanti": ["લઘુ અજિતશાંતિસ્તવ અષ્ટમ"],
    "smaran-9-bruhad-ajitshanti": ["બૃહદ્ અજિતશાંતિ"],
    "deshavagasik-pachchakkhan": ["દેશાવગાશિક વ્રતનું પચ્ચખ્ખાણ"],
    "deshavagasik-samayik-pachchakkhan": ["દેશાવગાશિક સામાયિક વ્રતનું પચ્ચખ્ખાણ"],
};

// Sutras that are procedural lists/declarations whose body must be kept as ONE
// verbatim block, never split into "verses". These print a tab-separated COUNT
// column (e.g. the 50-bol padilehana inspection) whose digits are item counts,
// not verse numbers, so the trailing-number verse rule must not segment them.
// (Per-sutra data, like the heading needles — not a parser special-case.)
const FORCE_SINGLE_BLOCK = new Set([
    "padilehana",
]);

// Sutras that are ONE continuous prose confession over an EXCLUSIVE page range,
// numbered by monotonically increasing top-level ॥ N ॥ markers but embedding
// sub-gāthās that restart numbering and ॥…॥ transitional rubrics — the generic
// section splitter truncates these at the first rubric (dropping later vows) and
// would close spurious verses at embedded numbers. These are split by the
// monotonic top-level counter instead (src/corpus/book-parser.js
// extractMonotonicVowVerses), keeping embedded gāthās/rubrics inline; the trailing
// concluding section (saṁlekhanā + ācāra atichāra + final pratyākhyāna) becomes a
// final verse with printedNumber=null. (Per-sutra data, like HEADING_NEEDLES.)
const MONOTONIC_VOW_SPLIT = new Set([
    "bruhad-atiyar",
]);

// Secondary splits for monotonic-split sutras: per-sutra needles that split ONE
// monotonic verse into two at the line where a distinct second section begins.
// (1) The book places vow 7's karmataḥ (the 15 karmādāna) AFTER vow 7's ॥૭॥ but
//     BEFORE vow 8, so the monotonic pass (which only breaks at ॥N॥) lumps the
//     karmādāna list together with vow 8 (anarthadaṇḍa). Needle "આઠમું અનર્થ દંડ"
//     splits them (spelled-out heading, can't collide with karmādāna item 8).
// (2) The concluding tail verse runs saṁlekhanā + the 85-atichāra confession
//     together with the five-ācāra confession (jñāna/darśana/cāritra/tapa/vīrya)
//     + the final pratyākhyāna — distinct sections, and as one ~2255-char verse
//     its dense word-by-word output is too large to translate reliably (the
//     Gujarati call hangs on the oversized output). Two needles cut it into three
//     tractable verses at their section openings: "રહે આશાતના" (jñānācāra opening
//     line → ends the saṁlekhanā/85-atichāra wrap-up) and "વીર્યાચારે" (vīryācāra
//     opening → ends the jñāna/darśana/tapa block, leaving vīrya + the final
//     pratyākhyāna). Both are simple glyphs that byte-match the page (unlike the
//     જ્ઞ conjunct) and are verified unique to this sutra. A third needle
//     "દર્શનાચારે" (darśanācāra opening) further splits the jñāna/darśana/tapa
//     block — its dense Gujarati word-by-word was still oversized — into jñāna and
//     darśana+tapa, so every conclusion piece is small enough to translate.
const SECONDARY_SPLITS = {
    "bruhad-atiyar": ["આઠમું અનર્થ દંડ", "રહે આશાતના", "વીર્યાચારે", "દર્શનાચારે"],
};

// Split a monotonic verse at each line that begins a configured second section
// (needle found mid-verse, not at the verse start). Applied recursively so a verse
// containing several section openings (e.g. the bruhad-atiyar conclusion) is cut
// into all its parts. The split-off section (before the needle) carries
// printedNumber=null (a sub-section with no own top-level number); the remainder
// keeps the verse's original ॥N॥ number (so e.g. vow-8 anarthadaṇḍa stays "8").
function applySecondarySplits(verses, needles) {
    const splitOne = (v) => {
        const text = v.text || "";
        for (const needle of needles) {
            const idx = text.indexOf(needle);
            if (idx <= 0) continue;
            const lineStart = text.lastIndexOf("\n", idx) + 1; // start of the needle's line
            if (lineStart <= 0) continue;                       // needle is on the verse's first line — skip
            const first = text.slice(0, lineStart).trim();
            const second = text.slice(lineStart).trim();
            if (!first || !second) continue;
            // first chunk = a sub-section (null); the remainder carries this verse's number
            return [...splitOne({ number: null, text: first }), ...splitOne({ number: v.number, text: second })];
        }
        return [v];
    };
    const out = [];
    for (const v of verses) out.push(...splitOne(v));
    return out;
}

// Sutras that are numbered verses FOLLOWED by a verbatim prose coda which carries
// no verse number (so the numbered-verse parser drops it as `leftover`). For
// these, the trailing prose between the last numbered verse and the first
// વિધિ/નોંધ (procedural/editorial) line is appended as a final verse
// (printedNumber=null). E.g. muni-vandana ends with the Anchalgachchha paṭṭāvalī
// roll-call of later ācāryas (a prose continuation of the lineage), and the short
// atichāra (laghu-atiyar) ends with the saṁlekhanā + 85-atichāra summary + the
// desāvagāsiaṁ pratyākhyāna — neither must be dropped. (Per-sutra data.)
const APPEND_TRAILING_PROSE = new Set([
    "muni-vandana",
    "laghu-atiyar",
]);

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
        let singleBlock = "";
        try {
            if (MONOTONIC_VOW_SPLIT.has(sutraId)) {
                // One long prose confession over an exclusive page range: split by
                // the monotonic top-level vow markers, then append the concluding
                // section (saṁlekhanā + ācāra atichāra + final formula) as a verse.
                const res = extractMonotonicVowVerses(config.dataDir, meta.pdfPages || []);
                verses = res.verses.slice();
                if (res.tail && res.tail.length) verses.push({ number: null, text: res.tail });
                // Secondary per-sutra splits (e.g. separate vow-7 karmataḥ from vow-8).
                if (SECONDARY_SPLITS[sutraId]) verses = applySecondarySplits(verses, SECONDARY_SPLITS[sutraId]);
            } else {
                const res = extractSutraVerses(config.dataDir, meta.pdfPages || [], needles);
                verses = res.verses;
                // Fallback for genuine prose / lists / single formulas (no per-item
                // numbered markers): if a section/anchor matched but produced no
                // numbered verses, emit its verbatim body as ONE shloka so the sutra
                // is translatable and renders real text instead of "Text pending".
                // FORCE_SINGLE_BLOCK sutras (procedural count-column lists) always
                // collapse to one block regardless of any spurious column digits.
                if ((verses.length === 0 || FORCE_SINGLE_BLOCK.has(sutraId)) && res.matchedHeadings.length > 0) {
                    if (FORCE_SINGLE_BLOCK.has(sutraId)) verses = [];
                    singleBlock = bodyToSingleBlock(res.body || []);
                }
                // Numbered verses followed by a verbatim prose coda (e.g. the
                // paṭṭāvalī roll-call after muni-vandana's gāthās): the numbered
                // parser leaves that coda in `leftover`; cut it at the first
                // વિધિ/નોંધ line and append it as a final verse so it is not lost.
                if (APPEND_TRAILING_PROSE.has(sutraId) && verses.length > 0 && (res.leftover || []).length) {
                    const codaLines = [];
                    for (const l of res.leftover) {
                        if (/^(વિધિ|નોંધ)\s*[:：]/.test(l.trim())) break;
                        codaLines.push(l);
                    }
                    const coda = bodyToSingleBlock(codaLines);
                    if (coda && coda.length) verses = [...verses, { number: null, text: coda }];
                }
            }
        } catch (e) {
            logger.warn(`Verse extraction failed for ${sutraId}: ${e.message}`, "build-corpus");
        }

        // Normalize to a shlokas list: numbered verses, or the single prose block.
        const shlokaSources = verses.length > 0
            ? verses.map(v => ({ printedNumber: v.number, text: v.text }))
            : (singleBlock ? [{ printedNumber: null, text: singleBlock }] : []);
        const hasVerses = shlokaSources.length > 0;
        if (hasVerses) withVerses++;
        totalShlokas += shlokaSources.length;

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
            shlokas: shlokaSources.map((v, i) => ({
                // Sequential 1..N within the sutra guarantees a unique shlokaId even when
                // the book restarts verse numbering per sub-section (e.g. the multi-dhala
                // chaityavandan, or vandana + pattaavali). The book's printed number is
                // kept as `printedNumber` for display.
                shlokaId: mkShlokaId(sutraId, i + 1),
                number: i + 1,
                printedNumber: v.printedNumber,
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
