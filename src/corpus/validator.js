import fs from "node:fs";
import path from "node:path";
import { dominantScript, scriptStats } from "../utils/unicode.js";

export function validateCanonical(canonical) {
    const issues = [];
    if (!canonical || !Array.isArray(canonical.sutras)) {
        return { ok: false, issues: ["canonical missing or has no sutras array"] };
    }
    const seenSutraIds = new Set();
    const seenShlokaIds = new Set();
    for (const sutra of canonical.sutras) {
        if (!sutra.sutraId) issues.push(`sutra missing sutraId: ${sutra.name_native || "?"}`);
        if (seenSutraIds.has(sutra.sutraId)) issues.push(`duplicate sutraId: ${sutra.sutraId}`);
        seenSutraIds.add(sutra.sutraId);
        if (typeof sutra.order !== "number") issues.push(`${sutra.sutraId}: missing numeric order`);
        if (!Array.isArray(sutra.shlokas) || sutra.shlokas.length === 0) {
            // Prose / vidhi-heavy sutras legitimately carry no numbered verses; the
            // builder flags them with needsVerseExtraction. Only flag the rest.
            if (!sutra.needsVerseExtraction) issues.push(`${sutra.sutraId}: no shlokas`);
            continue;
        }
        const numbers = new Set();
        for (const sh of sutra.shlokas) {
            if (!sh.shlokaId) issues.push(`${sutra.sutraId}: shloka missing shlokaId`);
            if (seenShlokaIds.has(sh.shlokaId)) issues.push(`duplicate shlokaId: ${sh.shlokaId}`);
            seenShlokaIds.add(sh.shlokaId);
            if (numbers.has(sh.number)) issues.push(`${sutra.sutraId}: duplicate shloka number ${sh.number}`);
            numbers.add(sh.number);
            if (!sh.native_script || sh.native_script.length < 4) {
                issues.push(`${sh.shlokaId}: empty/short native_script`);
                continue;
            }
            const detected = dominantScript(sh.native_script);
            if (sh.script && sh.script !== "mixed" && sh.script !== detected && detected !== "empty") {
                issues.push(`${sh.shlokaId}: declared script=${sh.script} but detected=${detected}`);
            }
        }
    }
    const sortedOrders = canonical.sutras.map(s => s.order).sort((a, b) => a - b);
    for (let i = 0; i < sortedOrders.length; i++) {
        if (sortedOrders[i] !== i + 1) { issues.push(`order is not contiguous starting at 1: got ${sortedOrders.join(",")}`); break; }
    }
    return { ok: issues.length === 0, issues };
}

const VIDHI_KINDS = ["adesh", "direction", "formula"];
const VIDHI_SPEAKERS = ["shishya", "guru"];

// Native-layer validation for data/corpus/vidhi.json (Phase A). Asserts:
//  1. Coverage — every { type:"vidhi" } step in the structure tree is present.
//  2. Native integrity — segments well-formed, verbatim Gujarati, sequential ids.
//  3. Links resolve — every non-null leadsToSutra exists in the sutra registry.
//  6. Structural — no duplicate segment ids.
export function validateVidhi(structure, vidhi) {
    const issues = [];
    if (!vidhi || !Array.isArray(vidhi.steps)) {
        return { ok: false, issues: ["vidhi.json missing or has no steps array"] };
    }
    // 1. Coverage: required vidhi-step ids from the structure tree.
    const required = [];
    for (const prat of structure.pratikramans || []) {
        for (const step of prat.sequence || []) if (step.type === "vidhi") required.push(step.id);
    }
    const present = new Map(vidhi.steps.map(s => [s.vidhiId, s]));
    for (const id of required) {
        if (!present.has(id)) issues.push(`coverage: missing vidhi step '${id}' in vidhi.json`);
    }

    const sutraIds = new Set(Object.keys(structure.sutras || {}));
    const seenSegmentIds = new Set();
    for (const step of vidhi.steps) {
        if (!step.vidhiId) { issues.push("a vidhi step is missing vidhiId"); continue; }
        if (step.needsExtraction) continue; // legitimately empty; flagged for human follow-up
        if (!Array.isArray(step.segments) || step.segments.length === 0) {
            issues.push(`${step.vidhiId}: no segments (and not flagged needsExtraction)`);
            continue;
        }
        step.segments.forEach((seg, i) => {
            const expectedId = `${step.vidhiId}/${String(i + 1).padStart(2, "0")}`;
            if (seg.segmentId !== expectedId) issues.push(`${step.vidhiId}: segmentId '${seg.segmentId}' != expected '${expectedId}'`);
            if (seenSegmentIds.has(seg.segmentId)) issues.push(`duplicate segmentId: ${seg.segmentId}`);
            seenSegmentIds.add(seg.segmentId);
            if (!VIDHI_KINDS.includes(seg.kind)) issues.push(`${seg.segmentId}: invalid kind '${seg.kind}'`);
            if (seg.kind === "direction") {
                if (seg.speaker != null) issues.push(`${seg.segmentId}: direction must have null speaker`);
            } else if (seg.speaker != null && !VIDHI_SPEAKERS.includes(seg.speaker)) {
                issues.push(`${seg.segmentId}: invalid speaker '${seg.speaker}'`);
            }
            if (!Array.isArray(seg.source_ids) || !seg.source_ids.includes("book")) {
                issues.push(`${seg.segmentId}: source_ids must include "book"`);
            }
            if (!seg.native_script || seg.native_script.trim().length < 1) {
                issues.push(`${seg.segmentId}: empty native_script`);
            } else {
                const s = scriptStats(seg.native_script);
                const ratio = s.total ? s.gujarati / s.total : 0;
                if (ratio < 0.85) issues.push(`${seg.segmentId}: Gujarati ratio ${(ratio * 100).toFixed(0)}% < 85% (possible translation instead of transcription)`);
            }
            if (seg.leadsToSutra && !sutraIds.has(seg.leadsToSutra)) {
                issues.push(`${seg.segmentId}: leadsToSutra '${seg.leadsToSutra}' not in the sutra registry`);
            }
        });
    }
    return { ok: issues.length === 0, issues };
}

// Translation-layer validation (Phase B). For each present
// data/translations/_vidhi/<vidhiId>.<lang>.json: parses, aligns 1:1 with the
// native segments (same ids, same order), required fields present, target-script
// ratio >= 85% for gujarati/hindi (english recitation must be Latin/IAST).
export function validateVidhiTranslations(config, vidhi, langs) {
    const issues = [];
    if (!vidhi || !Array.isArray(vidhi.steps)) return { ok: false, issues: ["vidhi.json missing"] };
    const scriptForLang = { english: "latin", gujarati: "gujarati", hindi: "devanagari" };
    const dir = path.join(config.dataDir, "translations", "_vidhi");
    for (const step of vidhi.steps) {
        if (step.needsExtraction || !Array.isArray(step.segments) || step.segments.length === 0) continue;
        for (const lang of langs) {
            const fp = path.join(dir, `${step.vidhiId}.${lang}.json`);
            if (!fs.existsSync(fp)) continue; // not yet translated — not an error
            let tr;
            try { tr = JSON.parse(fs.readFileSync(fp, "utf8")); }
            catch (e) { issues.push(`${step.vidhiId} [${lang}]: unparseable (${e.message})`); continue; }
            if (!Array.isArray(tr.segments) || tr.segments.length !== step.segments.length) {
                issues.push(`${step.vidhiId} [${lang}]: ${tr.segments?.length ?? 0} segments != ${step.segments.length} native`);
                continue;
            }
            const want = scriptForLang[lang] || "latin";
            tr.segments.forEach((seg, i) => {
                const nativeSeg = step.segments[i];
                const expectedId = nativeSeg.segmentId;
                if (seg.segmentId !== expectedId) issues.push(`${step.vidhiId} [${lang}]: segment ${i} id '${seg.segmentId}' != '${expectedId}'`);
                // Every segment needs a plain meaning + idiomatic rendering; a chant
                // line (recitation) is only expected for the SPOKEN segments — a pure
                // procedural `direction` legitimately has no recitation.
                const requireRecitation = nativeSeg.kind === "adesh" || nativeSeg.kind === "formula";
                const fields = requireRecitation
                    ? ["recitation", "plainMeaning", "idiomaticTranslation"]
                    : ["plainMeaning", "idiomaticTranslation"];
                for (const f of fields) {
                    if (!seg[f] || String(seg[f]).trim().length < 1) issues.push(`${seg.segmentId} [${lang}]: empty ${f}`);
                }
                // The chant-script ratio applies only to genuinely chanted segments
                // (adesh/formula). A `direction`'s recitation, when present, is a
                // procedural stage-cue (an em-dash placeholder or a parenthetical
                // aside) — not a chant line — so it is not held to the target-script bar.
                if (requireRecitation && seg.recitation && seg.recitation.trim()) {
                    const s = scriptStats(seg.recitation);
                    const ratio = s.total ? (s[want] || 0) / s.total : 0;
                    if (ratio < 0.85) issues.push(`${seg.segmentId} [${lang}]: recitation ${want} ratio ${(ratio * 100).toFixed(0)}% < 85%`);
                }
            });
        }
    }
    return { ok: issues.length === 0, issues };
}
