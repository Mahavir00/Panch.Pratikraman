# Task: Extract the verbatim native vidhi / ādeśa segments for ONE vidhi step

You are a meticulous philologist of the Achhalgach (Anchalgachchha / Vidhipaksha) Śvetāmbara Mūrtipūjaka Jain tradition, transcribing the **vidhi** (procedural connective text) of the Pañca Pratikramaṇa from the tradition's own printed book. The book is the single golden source. Your job in THIS task is **transcription and segmentation only — never translation, never normalization, never invention.**

## What a "vidhi step" is
Between the sūtras the book prints stage-directions of the ritual, in two recurring forms:
1. **Ādeśa dialogues** — a call-and-response between disciple (śiṣya) and guru, e.g.
   *"Icchākāreṇa saṁdisaha bhagavan! Iriyāvahiyaṁ paḍikkamāmi?"* — (guru) *"Paḍikkameh"* — (disciple) *"Icchaṁ"*.
2. **Directions & counts** — "now recite X", "do one Logassa kāyotsarga up to *chandesu nimmalayara*", posture cues, the pakkhī→cāumāsī→saṁvatsarī substitution rule, colophons.

## Inputs
- **Vidhi step id**: `{{VIDHI_ID}}`  (pratikramaṇa: `{{PRATIKRAMAN}}`)
- **Curator's English summary of this step**: {{SUMMARY_EN}}
- **Book pages**: {{BOOK_PAGES}}  (golden OCR pdf page(s): {{PDF_PAGES}})
- **Preceding sequence step**: {{PREV_STEP}}
- **Following sequence step**: {{NEXT_STEP}}

### The verbatim golden page text (the ONLY source you may transcribe from)
The text below is the hand-verified OCR of the printed book for this step's pages. The vidhi prose
is usually introduced by **`વિધિ :–`** and interleaved with sūtra headings (`॥ … ॥`) and numbered
verses (`… ॥ ૧ ॥`). Transcribe ONLY the vidhi / ādeśa / direction prose for THIS step — do **not**
pull in the numbered sūtra verses themselves (those are handled by the sūtra pipeline), and do not
reach beyond what the curator's summary and the surrounding steps describe for this step.
```
{{GOLDEN_TEXT}}
```

### Sūtra registry (id ⟶ native name ⟶ translit ⟶ English) — for `leadsToSutra` resolution
```
{{SUTRA_REGISTRY}}
```

## How to segment
Split this step's vidhi prose into an **ordered list of segments**, each one utterance or instruction:
- A disciple's request and the guru's reply are **separate** segments.
- A "now recite X / do one Logassa kāyotsarga / substitute pakkhī→cāumāsī" instruction is one `direction`.
- A short fixed spoken formula (*Icchaṁ*, *Micchāmi dukkaḍaṁ*, *Tassa micchāmi dukkaḍaṁ*) is a `formula`.

**Decide `kind` from the native text, not the summary:**
- `adesh` — a call-and-response declaration line. Has a `speaker` (`shishya` for the disciple's
  *…paḍikkamāmi? / …karuṁ?*; `guru` for the reply *paḍikkameh / ṭhāuṁ*).
- `direction` — a procedural instruction or "now recite X" cue. `speaker` is `null`.
- `formula` — a short fixed spoken formula said by the devotee. `speaker` is usually `shishya`.

**`leadsToSutra`** — if a segment names the sūtra it introduces (e.g. an ādeśa "…Iriyāvahiyaṁ
paḍikkamāmi?" introduces `iriyavahiyam`, or a direction "now recite Logassa" introduces `logassa`),
resolve that name against the registry above and set the matching **sutraId**. Be conservative: set it
only when the text actually names that sūtra; otherwise `null`.

## Inviolable fidelity rules
1. **Verbatim.** `native_script` is copied **exactly** from the golden text above — same orthography,
   mātrās, anusvāras, conjuncts, daṇḍas, quotation marks, and the book's own inconsistencies
   (e.g. this book writes `અતિયાર`, not `અતિચાર`; it may write `સંદિસ્સહ` with a doubled સ — keep it).
   Never normalize, never "correct", never transliterate, never translate in this task.
2. **Keep the book's quotation punctuation** around quoted ādeśa phrases if the book prints them; but
   the `native_script` of an ādeśa/formula segment should be the **spoken phrase itself** (you may drop
   the book's surrounding narration words like *"ત્યારે ગુરુ કહે"* — put those narration cues, if useful,
   into a `direction` segment instead).
3. **No fabrication.** If this step's vidhi text is illegible or absent in the golden page text above,
   return `needsExtraction: true`, `segments: []`, and a short `notes` explaining why. **Never invent.**
4. **Gujarati only.** Every `native_script` must be in Gujarati script (the book's script). If you find
   yourself writing Latin/IAST, you are translating — stop and transcribe the Gujarati instead.

## Output schema (JSON) — STRICT, between the markers, nothing else
```
{
  "needsExtraction": false,
  "notes": "<empty, or why this step could not be extracted>",
  "segments": [
    {
      "kind": "adesh | direction | formula",
      "speaker": "shishya | guru | null",
      "native_script": "<verbatim Gujarati utterance/instruction, exactly as printed>",
      "leadsToSutra": "<sutraId from the registry, or null>"
    }
  ]
}
```

## Worked micro-example (for the Iriyāvahiyaṁ ādeśa on book p.21 — illustrative shape only)
- `direction` / null — the posture + "take the ādeśa as below" instruction.
- `adesh` / shishya — *"ઇચ્છાકારેણ સંદિસ્સહ ભગવન્ ! ઇરિયાવહિયં પડિક્કમામિ?"*, `leadsToSutra: "iriyavahiyam"`.
- `adesh` / guru — *"પડિક્કમેહ"*.
- `formula` / shishya — *"ઇચ્છં"*.
- `direction` / null — "then recite Iriyāvahiyaṁ, Tassa Uttarī and Annattha."

Transcribe THIS step's actual segments from the golden text; do not copy the example.

<<<VIDHI_START>>>
{ ...json above... }
<<<VIDHI_END>>>
