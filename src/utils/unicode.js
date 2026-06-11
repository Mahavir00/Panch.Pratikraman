// Unicode script helpers for validating Indic scripts in extracted/translated content.
// Ranges per Unicode standard.

const RANGES = {
    gujarati:  [[0x0A80, 0x0AFF]],
    devanagari:[[0x0900, 0x097F]],
    // Basic Latin + Latin-1 Supplement + Latin Extended-A/B, PLUS the IAST
    // transliteration ranges: Combining Diacritical Marks (decomposed IAST,
    // e.g. m+◌̇) and Latin Extended Additional (precomposed IAST letters
    // ṁ ṅ ṣ ṭ ḍ ṇ ḥ ṛ ḷ …). Without the latter, short IAST words like "icchaṁ"
    // are mis-scored as non-Latin.
    latin:     [[0x0020, 0x007F], [0x00A0, 0x024F], [0x0300, 0x036F], [0x1E00, 0x1EFF]],
};

function inRanges(cp, ranges) {
    for (const [a, b] of ranges) if (cp >= a && cp <= b) return true;
    return false;
}

export function scriptStats(text) {
    const counts = { gujarati: 0, devanagari: 0, latin: 0, other: 0, total: 0 };
    for (const ch of String(text || "")) {
        const cp = ch.codePointAt(0);
        if (cp === 0x20 || cp === 0x0A || cp === 0x0D || cp === 0x09) continue;
        counts.total++;
        if (inRanges(cp, RANGES.gujarati)) counts.gujarati++;
        else if (inRanges(cp, RANGES.devanagari)) counts.devanagari++;
        else if (inRanges(cp, RANGES.latin)) counts.latin++;
        else counts.other++;
    }
    return counts;
}

export function dominantScript(text) {
    const s = scriptStats(text);
    if (s.total === 0) return "empty";
    const entries = [["gujarati", s.gujarati], ["devanagari", s.devanagari], ["latin", s.latin]];
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][1] === 0 ? "other" : entries[0][0];
}

export function assertScript(text, expected, { minRatio = 0.5 } = {}) {
    const s = scriptStats(text);
    if (s.total === 0) return { ok: false, reason: "empty" };
    const hits = s[expected] || 0;
    const ratio = hits / s.total;
    return { ok: ratio >= minRatio, ratio, stats: s };
}
