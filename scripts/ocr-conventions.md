# OCR Transcription Conventions — Panch Pratikraman scanned book

> Shared spec for every OCR pass (subagents and the future `ppt ocr` command).
> Source: `input/panch_pratikraman.pdf` — a camera-scanned Gujarati Jain liturgical
> book, **"પંચ પ્રતિક્રમણ સૂત્ર – વિધિ સહિત"** (Anchalgachchha / Achhalgach tradition).
> The scan is high quality and fully legible. **The bar is ZERO mistakes.**

## Input tiles
Page images: `data/book/tiles/page-NNN-top.jpg` and `data/book/tiles/page-NNN-bottom.jpg`
(NNN = zero-padded 3-digit PDF page, 001..090). The top and bottom tiles **overlap
~6%** vertically: 1–3 lines near the middle appear in BOTH tiles. When joining, include
each overlapping line **exactly once** (dedup the seam).

Read every tile with the image-view tool. If you cannot view images, stop and say so.

## Golden rules
1. **Verbatim.** Transcribe the Gujarati script EXACTLY as printed — every character,
   matra, anusvara (ં), visarga (ઃ), nukta, and conjunct. Do **NOT** translate,
   transliterate, normalize, modernize, or "fix" spelling. The book's own
   inconsistencies (e.g. `ધૂય` vs `ધુય`, `ચઉવ્વીસંપિ` vs `ચઉવીસંપિ`, `અપ્કાય` vs
   `અપૂકાય`) MUST be preserved as printed.
2. **Preserve line breaks** as printed in the body.
3. **Never guess.** If a glyph is genuinely unreadable/ambiguous after zooming, write
   `⟨?⟩` in its place and add an entry to the `uncertain` list with context. Do not
   silently invent a character.
4. **Distinguish carefully:** ઉ/ઊ and the u/ū matras (ુ vs ૂ); ઇ/ઈ and i/ī matras
   (િ vs ી); દ/ડ; ન/ણ; ચ/ચ્; double vs single consonants in conjuncts
   (e.g. `સુત્તત્થ` not `સુતત્થ`; `પચ્ચખ્ખામિ`). These are the most error-prone.

## Page anatomy → how to record each part
- **Running header** (top line, usually `પંચ પ્રતિક્રમણ સૂત્ર – વિધિ સહિત`, sometimes a
  section title): record in the `# header:` line and in meta, keep it OUT of the body.
- **Sutra / section headings** printed between bars, e.g. `॥ શ્રી નવકાર મહામંત્ર ॥` or
  `॥ ... કરેમિ ભંતે! સૂત્ર ॥`: keep verbatim on their own line in the body AND list in
  meta `sutraHeadings`.
- **Vidhi prose** (procedural instructions, often introduced by `વિધિ :–`): transcribe
  verbatim as body text.
- **Verse-number markers** like `॥ ૧ ॥` (the book spaces the bars): keep verbatim, in
  place. List the integers in meta `verseNumbers`.
- **Inline footnote markers**: a small superscript digit/symbol attached to a body word
  (e.g. `દેવ પ્રતિમા,¹`). Represent inline with `¹ ² ³ ⁴ ⁵` (or the printed symbol
  `*`, `†`). Matching **footnotes** sit below a horizontal rule at the page bottom and
  are frequently SPELLING CORRECTIONS or clarifications — capture them.
- **Page number** (bottom-center Gujarati digits inside a `❋` decorative row): convert to
  arabic and record in meta `bookPage`; keep it OUT of the body.

## Output (two files per page)
`data/book/pages/page-NNN.txt`:
```
# page: NNN
# book_page: <arabic number, or ?>
# header: <running header text, or ->

<verbatim body — prose, headings, and verses, line by line as printed>

--- FOOTNOTES ---
¹ <footnote text>
```
(Omit the `--- FOOTNOTES ---` section entirely when a page has no footnotes.)

`data/book/pages/page-NNN.meta.json`:
```json
{
  "page": 0,
  "bookPage": "<arabic or ?>",
  "header": "<text>",
  "sutraHeadings": ["..."],
  "verseNumbers": [1, 2],
  "footnotes": [{ "marker": "¹", "text": "..." }],
  "uncertain": [{ "near": "<surrounding text>", "why": "..." }],
  "separator": true
}
```

## Self-verification (mandatory)
After writing a page, RE-VIEW both tiles and compare against your file line by line.
Fix any mismatch. Only mark a page done when its text matches the scan exactly. Report
the count of `uncertain` glyphs (ideally zero) with page + context.
