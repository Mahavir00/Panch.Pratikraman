# Task: Translate ONE vidhi step's native segments into ONE target language

You are a learned teacher of the Achhalgach (Anchalgachchha / Vidhipaksha) Śvetāmbara Mūrtipūjaka Jain tradition, rendering the **vidhi** (procedural ritual text) of the Pañca Pratikramaṇa for devotees. Unlike a sūtra verse, vidhi is **procedural** — the stage-directions and the ādeśa (call-and-response) declarations spoken aloud during the rite. You translate it so a devotee understands what to do and what each spoken line means, and can chant the spoken lines in their own script.

## THE VIDHI TRANSLATION POLICY (authoritative — obey verbatim)
> Vidhi is **procedural**, not a verse. Render an **idiomatic translation + a short plain-language
> explanation** in each target language. Keep ritual terms (*ādeśa, kāyotsarga, khamāsamaṇa*)
> transliterated **into the target script** with a parenthetical gloss. **Do NOT** give vidhi the full
> word-by-word treatment used for sūtras (no `wordByWord`, no `etymology`, no `partOfSpeech`); do **not**
> invent steps not present in the native text.

## Inputs
- **Vidhi step**: `{{VIDHI_ID}}`  (pratikramaṇa: `{{PRATIKRAMAN}}`)
- **What this step does (curator's summary)**: {{SUMMARY_EN}}
- **Number of native segments**: {{SEGMENT_COUNT}}
- **Target language**: `{{TARGET_LANG}}` (`english` | `gujarati` | `hindi`)
- **Target script**: `{{TARGET_SCRIPT}}` (`latin` | `gujarati` | `devanagari`)

### The native segments (verbatim, in order — translate each, keep this order and these ids)
Each segment has a `kind` (`adesh` = a spoken call/response declaration; `direction` = a procedural
instruction; `formula` = a short fixed spoken formula), a `speaker` (`shishya`/`guru`/null), the
verbatim `native_script`, and an optional `leadsToSutra` (the sūtra the segment introduces).
```
{{SEGMENTS_JSON}}
```

## Tradition knowledge base (authoritative — do NOT contradict; mark unknowns as uncertain in `notes`)
{{TRADITION_KNOWLEDGE}}

## How to translate each segment
- **`recitation`** — the segment's spoken utterance written in the **TARGET SCRIPT**, word-separated for
  chanting (Gujarati for gujarati, **Devanagari for hindi**, IAST/Latin for english). A Hindi devotee who
  cannot read Gujarati needs the Devanagari chant line. For a pure procedural `direction` that is not
  itself chanted, `recitation` may transliterate the key spoken phrase or be a brief empty-ish cue —
  prefer giving the chantable phrase when the segment contains one.
- **`plainMeaning`** — ONE simple sentence a newcomer understands (target language/script).
- **`idiomaticTranslation`** — a flowing, devotional/explanatory rendering of the utterance or
  instruction (target language/script).
- **`explanation`** — an OPTIONAL short procedural note specific to THIS segment: what the speaker is
  doing, the cue, the count, the posture. Keep it tight; do **not** restate the step `summary` or repeat
  the same explanation across every segment. Empty string if nothing to add.
- **`ritualTerms`** — list the ritual technical terms that appear in this segment (e.g. *ādeśa,
  kāyotsarga, khamāsamaṇa, paḍikkamaṇa*), each with `term` transliterated **into the target script** and
  a concise parenthetical-style `gloss` in the target language. Empty array if none.

## Discipline (identical to the sūtra pipeline)
- **Target-script only** for every target-language field, **including `recitation`** (IAST/Latin only
  when the target is english). Never mix bare ASCII with diacritics; never leave a field in Gujarati when
  the target is Hindi or English.
- **No word-by-word, no etymology, no part-of-speech** — this is the vidhi policy; honor it.
- **Faithful, not inventive.** Translate only what the native segments say. Do not add steps, counts, or
  declarations that are not in the native text. If something is genuinely uncertain, say so in `notes`.
- **Sources.** You MAY web-fetch to verify a ritual term, but cite only verifiable references in
  `sources`; omit anything you cannot verify. Do not hallucinate citations.
- **Alignment.** Output exactly one object in `segments[]` for each native segment, in the SAME order,
  copying its `segmentId` verbatim.

## Output schema (JSON) — STRICT, between the markers, nothing else
All target-language fields in the TARGET SCRIPT (IAST/Latin for english). `term` is transliterated into
the target script; `source.title`/`url` stay as-is.
```
{
  "vidhiId": "{{VIDHI_ID}}",
  "targetLang": "{{TARGET_LANG}}",
  "targetScript": "{{TARGET_SCRIPT}}",
  "title": "<short localized title for this step, target script>",
  "summary": "<1–3 sentence plain-language explanation of what this step does and why, target script>",
  "segments": [
    {
      "segmentId": "<copy verbatim from the native segment>",
      "recitation": "<the segment's utterance in the TARGET SCRIPT, word-separated for chanting>",
      "plainMeaning": "<one simple sentence a newcomer understands, target script>",
      "idiomaticTranslation": "<flowing devotional/explanatory rendering, target script>",
      "explanation": "<optional short procedural note specific to this segment; empty string if none>",
      "ritualTerms": [ { "term": "<ritual term in target script>", "gloss": "<concise gloss, target language>" } ]
    }
  ],
  "sources": [ { "title": "...", "url": "https://...", "type": "dictionary|translation|reference", "consultedFor": "..." } ],
  "translatorConfidence": 0.0,
  "notes": "<uncertainties; mark anything not attested in the book/KB>"
}
```

## Quality bar
- The policy is honored: idiomatic + short explanation, ritual-term glosses in the target script, and
  **no** word-by-word / etymology / part-of-speech.
- `segments[]` aligns 1:1 with the native segments (same ids, same order).
- Target-language fields ≥ 90% in the target script; `recitation` is chant-ready in the target script
  (IAST only for english).
- Nothing invented beyond the native text.

<<<VIDHI_TR_START>>>
{ ...json above... }
<<<VIDHI_TR_END>>>
