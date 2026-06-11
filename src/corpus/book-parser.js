// Book parser: extract verses (shlokas) from the golden OCR pages for a given
// PDF page range. The scanned book marks verse ENDS inline, e.g.
//   જયઇ જગજીવ જોણી, ... ભયવં. ॥ ૧ ॥
//   નમો અરિહંતાણં.<TAB>૧            (Navkar style: trailing tab + digit)
// and may carry a metre label before the number: "॥ ગાહા ॥ ૩૮ ॥".
//
// This is deterministic, lossless-by-default code: it returns the verses it can
// confidently delimit and the leftover (vidhi / prose) lines, so callers can
// decide. It does NOT normalize Gujarati spelling — the book is verbatim truth.

import fs from "node:fs";
import path from "node:path";

const DIGITS_GUJ = "૦૧૨૩૪૫૬૭૮૯";
const DIGITS_DEV = "०१२३४५६७८९";

export function gujToInt(s) {
    let out = "";
    for (const ch of String(s)) {
        const g = DIGITS_GUJ.indexOf(ch);
        const d = DIGITS_DEV.indexOf(ch);
        if (g >= 0) out += g;
        else if (d >= 0) out += d;
        else if (ch >= "0" && ch <= "9") out += ch;
    }
    return out.length ? parseInt(out, 10) : null;
}

const ANY_DIGIT = "0-9\u0966-\u096F\u0AE6-\u0AEF"; // ASCII + Devanagari + Gujarati

// A numeric verse marker ॥ <num> ॥ appearing ANYWHERE in a line (a preceding
// metre label like "॥ ગાહા ॥" is non-numeric so it is skipped; trailing
// "॥ ઇતિ ॥" after the number is ignored).
const NUM_MARKER_RE = new RegExp(`॥\\s*([${ANY_DIGIT}]+)\\s*॥`);
// Navkar-style: line ends with whitespace/tab + a bare number (no bars)
const TRAILING_NUM_RE = new RegExp(`[\\t ]+([${ANY_DIGIT}]+)\\s*$`);
// Strip a trailing metre label (॥ ગાહા ॥, ॥ સિલોગો ॥, ॥ ગાહા, etc.) left on the
// verse text after removing the number marker.
const TRAILING_LABEL_RE = /॥\s*[^॥0-9\u0966-\u096F\u0AE6-\u0AEF]*$/;

function stripPageHeaders(lines) {
    // Drop the per-page "# page:", "# book_page:", "# header:" comment lines and
    // the running-header italic line and page separators from assembled text.
    return lines.filter(l => {
        const t = l.trim();
        if (t.startsWith("# page:") || t.startsWith("# book_page:") || t.startsWith("# header:")) return false;
        if (t === "---" || t === "--- FOOTNOTES ---") return false;
        if (t.startsWith("## Page ")) return false;
        if (t.startsWith("*પંચ પ્રતિક્રમણ")) return false; // italic running header in full.md
        if (t === "પંચ પ્રતિક્રમણ સૂત્ર – વિધિ સહિત") return false;
        return true;
    });
}

// Extract verses from an array of body lines (already header-stripped).
// Returns { verses: [{ number, text }], leftover: [lines] }.
export function extractVersesFromLines(lines) {
    const verses = [];
    let buf = [];
    const leftover = [];
    for (const raw of lines) {
        const line = raw.replace(/\s+$/g, "");
        if (line.trim() === "") { if (buf.length) buf.push(""); continue; }

        let m = line.match(NUM_MARKER_RE);
        let num = null, head = null;
        if (m) { num = gujToInt(m[1]); head = line.slice(0, m.index).replace(TRAILING_LABEL_RE, "").trimEnd(); }
        else {
            const t = line.match(TRAILING_NUM_RE);
            // Only treat trailing-number as a verse end when the line has real text before it
            if (t && line.slice(0, t.index).trim().length > 0 && !/[॥।]/.test(line)) {
                num = gujToInt(t[1]);
                head = line.slice(0, t.index).trimEnd();
            }
        }

        if (num != null) {
            const body = head && head.length ? [...buf, head] : buf;
            const text = body.join("\n").replace(/\n{2,}/g, "\n").trim();
            if (text.length) verses.push({ number: num, text });
            buf = [];
        } else {
            buf.push(line);
        }
    }
    for (const l of buf) if (l.trim().length) leftover.push(l);
    return { verses, leftover };
}

// Load the body lines for a set of PDF page numbers from data/book/pages/page-NNN.txt,
// concatenated in order, with page-comment/footnote lines removed.
export function loadPageBodies(dataDir, pdfPages) {
    const pagesDir = path.join(dataDir, "book", "pages");
    const out = [];
    for (const p of pdfPages) {
        const fp = path.join(pagesDir, `page-${String(p).padStart(3, "0")}.txt`);
        if (!fs.existsSync(fp)) continue;
        const lines = fs.readFileSync(fp, "utf8").split(/\r?\n/);
        // drop the 3 leading "# ..." comment lines and the footnotes tail
        const fi = lines.findIndex(l => l.trim() === "--- FOOTNOTES ---");
        const body = (fi >= 0 ? lines.slice(0, fi) : lines);
        out.push(...stripPageHeaders(body));
    }
    return out;
}

// Heading detector: section/sutra headings and colophons are printed wrapped in
// double-danda bars and START with `॥` (or the `।।` two-danda form), e.g.
//   ॥ શ્રી નવકાર મહામંત્ર ॥   /   ॥ ઇતિ ... ॥   /   ।। શ્રી અષ્ટોત્તરી ... ।।
// Verse lines, by contrast, start with text and END with `॥ N ॥`, and use a
// single danda `।` only as a mid-verse separator. So: a heading is a line that
// starts with the bar AND does not end with a numeric verse marker.
export function isHeadingLine(line) {
    const t = line.trim();
    if (!t) return false;
    if (!/^(॥|।।)/.test(t)) return false;            // must start with a bar
    if (NUM_MARKER_RE.test(t)) return false;         // not a verse end (॥ N ॥)
    return /[\u0A80-\u0AFF\u0900-\u097F]/.test(t);   // contains Indic letters
}

// Split body lines into ordered sections at each heading line.
// Returns [{ heading, lines: [...] }]; lines before the first heading go into a
// leading section with heading="".
export function segmentByHeadings(lines) {
    const sections = [];
    let cur = { heading: "", lines: [] };
    for (const line of lines) {
        if (isHeadingLine(line)) {
            if (cur.heading || cur.lines.length) sections.push(cur);
            cur = { heading: line.trim(), lines: [] };
        } else {
            cur.lines.push(line);
        }
    }
    if (cur.heading || cur.lines.length) sections.push(cur);
    return sections;
}

// Convenience: extract verses for a sutra by locating the section whose heading
// matches one of `headingNeedles` (substring, normalized) within the given page
// range, then parsing verses from that section only (until the next heading).
export function extractSutraVerses(dataDir, pdfPages, headingNeedles) {
    const lines = loadPageBodies(dataDir, pdfPages);
    const sections = segmentByHeadings(lines);
    const norm = (s) => s.replace(/[॥।\s*]/g, "");
    const needles = headingNeedles.map(norm);
    const matched = sections.filter(sec => {
        const h = norm(sec.heading);
        return needles.some(n => n.length > 0 && h.includes(n));
    });
    if (matched.length === 0) return { verses: [], leftover: [], matchedHeadings: [] };
    const all = [];
    for (const sec of matched) all.push(...sec.lines);
    const { verses, leftover } = extractVersesFromLines(all);
    return { verses, leftover, matchedHeadings: matched.map(m => m.heading) };
}
