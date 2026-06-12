// Book parser: extract verses (shlokas) from the golden OCR pages for a given
// PDF page range. The source book marks verse ENDS inline, e.g.
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

// A numeric verse marker appearing ANYWHERE in a line, in either bar style the
// book uses: the double-danda glyph ॥ <num> ॥ (most sutras) or a pair of single
// dandas ।। <num> ।। (e.g. the Ashtottari Tirthmala). A preceding metre label
// like "॥ ગાહા ॥" is non-numeric so it is skipped; a trailing "॥ ઇતિ ॥" after
// the number is ignored.
const NUM_MARKER_RE = new RegExp(`(?:॥|।।)\\s*([${ANY_DIGIT}]+)\\s*(?:॥|।।)`);
// Trailing-number verse end (no closing bar): a line ends with an OPTIONAL single
// danda/period separator, then whitespace, then a bare number. This covers both
//   નમો અરિહંતાણં.<TAB>૧            (Navkar style: trailing tab + digit)
//   નમોત્થુણં અરિહંતાણં, ભગવંતાણં । ૧   (Shakrastava style: single danda + digit)
//   ... વંદામિ. ૧                      (period + digit)
// The single danda/period here is the verse closer, NOT a mid-verse `।` separator
// (those never sit immediately before an end-of-line number).
const TRAILING_NUM_RE = new RegExp(`[।.]?[\\t ]+([${ANY_DIGIT}]+)\\s*$`);
// Strip a trailing metre label (॥ ગાહા ॥, ॥ સિલોગો ॥, ॥ ગાહા, ।। …, etc.) left on
// the verse text after removing the number marker.
const TRAILING_LABEL_RE = /(?:॥|।।)\s*[^॥।0-9\u0966-\u096F\u0AE6-\u0AEF]*$/;

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
            // Treat a trailing number as a verse end when the line has real text
            // before it and carries no double-danda glyph (॥). A single danda `।`
            // is allowed: in the Shakrastava style it is the verse closer that
            // sits immediately before the end-of-line number (the regex captures
            // it); a mid-verse `।` never abuts an end-of-line number.
            if (t && line.slice(0, t.index).trim().length > 0 && !line.includes("॥")) {
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

// A heading is "open" (wraps onto the next physical line) when it starts with a
// bar but has no closing bar on the same line, e.g. the Karemi Bhante heading is
// printed as two lines:
//   ॥ શ્રાવકને સામાયિક લેવાનું પચ્ચખ્ખાણ
//   કરેમિ ભંતે! સૂત્ર ॥
// (Same for the Drumapushpika and Ashtottari headings.) We detect this so the
// needle can match the full joined heading and the closing line is not glued
// onto the section's first verse.
function isOpenHeadingStart(line) {
    if (!isHeadingLine(line)) return false;
    const t = line.trim();
    // strip the opening bar token, then check whether any closing bar remains
    const rest = t.replace(/^(॥|।।)/, "");
    return !/॥|।।/.test(rest);
}
function hasClosingBar(line) {
    return /॥|।।/.test(line.trim());
}

// Split body lines into ordered sections at each heading line. A heading that
// opens with a bar but does not close on the same line absorbs subsequent lines
// (up to a small cap) until the line that carries the closing bar, so a wrapped
// heading is treated as one heading and its closer is not mistaken for a verse.
// Returns [{ heading, lines: [...] }]; lines before the first heading go into a
// leading section with heading="".
export function segmentByHeadings(lines) {
    const sections = [];
    let cur = { heading: "", lines: [] };
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (isHeadingLine(line)) {
            if (cur.heading || cur.lines.length) sections.push(cur);
            let heading = line.trim();
            if (isOpenHeadingStart(line)) {
                // consume continuation lines until the closing bar (cap at 3)
                for (let j = i + 1; j < lines.length && j <= i + 3; j++) {
                    const cont = lines[j];
                    if (cont.trim() === "" || NUM_MARKER_RE.test(cont)) break;
                    heading += " " + cont.trim();
                    i = j;
                    if (hasClosingBar(cont)) break;
                }
            }
            cur = { heading, lines: [] };
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
//
// Two-stage match: first try the printed bar-delimited headings (the common
// case). If none match, fall back to a LINE ANCHOR — the first body line that
// contains a needle — and take everything from there until the next bar heading.
// This handles sutras whose title is printed as plain text (not bar-wrapped),
// e.g. the Mannaha Jinanam sajjhay (`મન્નહ જિણાણં … સજઝાય`) or the Rai
// mangalacharan (anchored on its first verse `મંગલં ભગવાન વીરો`).
export function extractSutraVerses(dataDir, pdfPages, headingNeedles) {
    const lines = loadPageBodies(dataDir, pdfPages);
    const sections = segmentByHeadings(lines);
    const norm = (s) => s.replace(/[॥।\s*]/g, "");
    const needles = headingNeedles.map(norm).filter(n => n.length > 0);
    const matched = sections.filter(sec => {
        const h = norm(sec.heading);
        return needles.some(n => h.includes(n));
    });
    let all;
    let matchedHeadings;
    if (matched.length > 0) {
        all = [];
        for (const sec of matched) all.push(...sec.lines);
        matchedHeadings = matched.map(m => m.heading);
    } else {
        // Line-anchor fallback: locate the first line containing a needle, then
        // take lines until the next bar heading (an unrelated section start).
        const anchor = lines.findIndex(l => { const n = norm(l); return needles.some(x => n.includes(x)); });
        if (anchor < 0) return { verses: [], leftover: [], matchedHeadings: [] };
        const slice = [];
        for (let i = anchor; i < lines.length; i++) {
            if (i > anchor && isHeadingLine(lines[i])) break;
            slice.push(lines[i]);
        }
        all = slice;
        matchedHeadings = [lines[anchor].trim()];
    }
    const { verses, leftover } = extractVersesFromLines(all);
    return { verses, leftover, matchedHeadings, body: all };
}

// Build a single verbatim text block from a matched section's body lines, for
// sutras that are genuinely prose / a list / a single formula (no per-item
// numbered verse markers). Drops the procedural `વિધિ :–` tail (and anything
// after it — that connective text belongs to the vidhi layer, not the sutra),
// trailing bar-only/colophon lines (`॥ ઇતિ ॥`, `॥ ૧`), and the running header,
// then returns the joined verbatim block (or "" if nothing substantive remains).
// Never normalizes Gujarati — the book is verbatim truth.
export function bodyToSingleBlock(bodyLines) {
    const out = [];
    for (const raw of bodyLines) {
        const t = raw.trim();
        if (/^વિધિ\s*[:：]/.test(t)) break;            // stop at the vidhi tail
        out.push(raw);
    }
    // trim leading/trailing blank + bar-only/colophon lines
    const isFiller = (t) => t === "" || /^(॥|।।)[\s।॥]*$/.test(t)
        || /^(॥|।।)?\s*ઇતિ\b.*$/.test(t)               // `॥ ઇતિ ॥` colophons
        || new RegExp(`^(॥|।।)?\\s*[${ANY_DIGIT}\\s।॥]*$`).test(t); // bar+number-only (`॥ ૧`)
    while (out.length && isFiller(out[0].trim())) out.shift();
    while (out.length && isFiller(out[out.length - 1].trim())) out.pop();
    // Strip a trailing inline colophon (`॥ ઇતિ ॥`, optionally `॥ ઇતિ ॥ ૧`) that
    // the book glues onto the last content line — the same end marker the numbered
    // parser drops. Leaves all substantive text (including footnote `*`) verbatim.
    if (out.length) {
        const last = out.length - 1;
        out[last] = out[last]
            .replace(new RegExp(`\\s*(?:॥|।।)\\s*ઇતિ\\s*(?:॥|।।)\\s*[${ANY_DIGIT}]*\\s*$`), "")
            .replace(new RegExp(`\\s*(?:॥|।।)\\s*[${ANY_DIGIT}]+\\s*(?:॥|।।)?\\s*$`), "")
            .replace(/\s*(?:॥|।।)\s*$/, "")            // a lone trailing closing bar
            .trimEnd();
    }
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Extract verses from a sutra that is ONE continuous prose confession occupying
// an EXCLUSIVE page range, whose top-level sections are closed by MONOTONICALLY
// increasing double-danda markers ॥ ૧ ॥ … ॥ K ॥, but which (a) embeds sub-gāthās /
// sub-lists that RESTART their own numbering (e.g. the 22-abhakṣya & 32-anantakāya
// gāthās, the anarthadaṇḍa sub-types) and (b) carries ॥…॥ transitional rubrics
// (“these five aṇuvratas are done, now the three guṇavratas…”). The generic
// section/verse splitter mis-handles both: segmentByHeadings truncates the sutra
// at a rubric, and extractVersesFromLines would close spurious verses at every
// embedded gāthā number. Here we read the WHOLE page range and split ONLY where a
// ॥ N ॥ marker equals the next EXPECTED top-level number; every other marker /
// rubric stays inline and verbatim. A leading bar-wrapped sutra title is dropped
// (parity with the generic path); processing stops at the trailing `॥ ઇતિ …`
// author colophon. Whatever follows the last top-level marker (the concluding
// saṁlekhanā + ācāra atichāra + final pratyākhyāna) is returned as `tail`.
// Never normalizes Gujarati — the book is verbatim truth.
export function extractMonotonicVowVerses(dataDir, pdfPages) {
    const lines = loadPageBodies(dataDir, pdfPages);
    // skip a leading blank/bar-title heading so the first verse begins at the
    // real opening text (keeps the first verses byte-identical to the old path).
    let start = 0;
    while (start < lines.length && (lines[start].trim() === "" || isHeadingLine(lines[start]))) start++;
    const verses = [];
    let buf = [];
    let expected = 1;
    for (let i = start; i < lines.length; i++) {
        const line = lines[i].replace(/\s+$/g, "");
        if (/^(॥|।।)\s*ઇતિ/.test(line.trim())) break;   // trailing author colophon — stop
        if (line.trim() === "") { if (buf.length) buf.push(""); continue; }
        const m = line.match(NUM_MARKER_RE);
        if (m && gujToInt(m[1]) === expected) {
            const head = line.slice(0, m.index).replace(TRAILING_LABEL_RE, "").trimEnd();
            const body = head && head.length ? [...buf, head] : buf;
            const text = body.join("\n").replace(/\n{2,}/g, "\n").trim();
            if (text.length) verses.push({ number: expected, text });
            buf = [];
            expected += 1;
        } else {
            buf.push(line);
        }
    }
    const tail = buf.join("\n").replace(/\n{2,}/g, "\n").trim();
    return { verses, tail };
}
