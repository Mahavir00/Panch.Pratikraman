# Task: High-fidelity OCR of ONE page of a camera-scanned Gujarati Jain liturgical book

You are an expert transcriber of printed Gujarati (Devanagari-family) Jain liturgical
texts. You are given the **two image tiles of a SINGLE book page**: the first attachment
is the **TOP** half, the second attachment is the **BOTTOM** half. The two tiles
**overlap ~6%** vertically, so 1–3 lines near the seam appear in BOTH tiles — include
each overlapping line **exactly once**.

Source book: **"પંચ પ્રતિક્રમણ સૂત્ર – વિધિ સહિત"** (Anchalgachchha / Achhalgach Śvetāmbara
tradition). The scan is high quality and fully legible. **The bar is ZERO mistakes.**

## Golden rules
1. **Verbatim.** Transcribe the Gujarati EXACTLY as printed — every character, matra,
   anusvara (ં), visarga (ઃ), nukta, and conjunct. Do **NOT** translate, transliterate,
   normalize, modernize, or "correct" spelling. The book's own inconsistencies
   (e.g. `ધૂય` vs `ધુય`, `ચઉવ્વીસંપિ` vs `ચઉવીસંપિ`, `અપ્કાય` vs `અપૂકાય`,
   `કાઉસગ્ગ` vs `કાઉસ્સગ્ગ`) MUST be preserved as printed. Note: this book spells
   "atichar/transgression" as **અતિયાર** (with ય), not અતિચાર — transcribe what you see.
2. **Preserve line breaks** as printed in the body (one array element per printed line).
3. **Never guess.** If a glyph is genuinely unreadable after careful inspection, write
   `⟨?⟩` in its place and add an entry to `uncertain` with surrounding context. Never
   silently invent a character.
4. **Distinguish carefully** (most error-prone): ઉ/ઊ and u/ū matras (ુ vs ૂ); ઇ/ઈ and
   i/ī matras (િ vs ી); દ/ડ; ન/ણ; single vs double consonants in conjuncts
   (e.g. `સુત્તત્થ` not `સુતત્થ`; `પચ્ચખ્ખામિ`). Gujarati digits: ૦૧૨૩૪૫૬૭૮૯ — ૪(4) and
   ૫(5) are easily confused; cross-check against the printed page number.

## Page anatomy → where each part goes
- **Running header** (top line, usually `પંચ પ્રતિક્રમણ સૂત્ર – વિધિ સહિત`, sometimes a
  section title): put in `header`; keep it OUT of `body`. Use `-` if absent.
- **Sutra / section headings** between bars, e.g. `॥ શ્રી નવકાર મહામંત્ર ॥` or
  `॥ ... કરેમિ ભંતે! સૂત્ર ॥`: keep verbatim as a `body` line AND list in `sutraHeadings`.
- **Vidhi prose** (procedural instructions, often after `વિધિ :–`): verbatim `body` text.
- **Verse-number markers** like `॥ ૧ ॥` (the book usually spaces the bars): keep verbatim
  in place in `body`. List the integers in `verseNumbers`.
- **Inline footnote markers**: a superscript digit/symbol on a body word
  (e.g. `દેવ પ્રતિમા,¹`). Represent inline with `¹ ² ³ ⁴ ⁵` or the printed symbol
  (`*`, `†`). The matching **footnotes** sit below a horizontal rule at the page bottom
  and are frequently SPELLING CORRECTIONS or clarifications — capture each in `footnotes`.
- **Page number** (bottom-center Gujarati digits, often inside a `❋` decorative row):
  convert to arabic in `bookPage`; keep it OUT of `body`. Set `separator` true if the
  decorative separator row is present.

## Inputs
- Page (PDF page index, zero-padded): `{{PAGE}}`
- Expected printed book-page number (hint, may be blank — verify against the scan): `{{BOOK_PAGE_HINT}}`

## Output — STRICT
Output ONE JSON object, and NOTHING else, strictly between the markers. Every string in
Gujarati script must be the verbatim printed text. `body` is an ARRAY OF LINES (no
embedded newlines inside an element). Use `-` / `[]` / `false` for empties.

```json
{
  "page": {{PAGE}},
  "bookPage": "<arabic number, or ?>",
  "header": "<running header, or ->",
  "sutraHeadings": ["<verbatim heading>", "..."],
  "verseNumbers": [1, 2],
  "footnotes": [{ "marker": "¹", "text": "<verbatim footnote, target script>" }],
  "uncertain": [{ "near": "<surrounding text>", "why": "<what is ambiguous>" }],
  "separator": true,
  "body": ["<verbatim line 1>", "<verbatim line 2>", "..."]
}
```

## Self-verification (mandatory, before you emit)
Re-examine BOTH tiles and compare against your transcription line by line. Confirm the
overlap seam is de-duplicated, every matra/anusvara/conjunct matches, and the page number
is read correctly. Only then emit. Aim for an empty `uncertain` array; if not empty, every
`⟨?⟩` in `body` MUST have a matching `uncertain` entry.

<<<OCR_START>>>
{ ...the single JSON object... }
<<<OCR_END>>>
