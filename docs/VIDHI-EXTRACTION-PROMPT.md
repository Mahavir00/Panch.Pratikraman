# Build the Vidhi & Ādeśa Extraction + Translation Pipeline — Copilot Session Prompt

> **How to use:** open a new GitHub Copilot (agent) session in the `C:\Repos\Panch.Pratikraman`
> workspace and paste this entire file as your first message. It is self-contained, but you MUST read
> `docs/DESIGN.md` end-to-end first (it is the single source of truth for this tool). This task extends
> the **generation tool**, not the website. When you finish, the tool can extract every **vidhi**
> (procedural connective text) and **ādeśa** (call-and-response ritual declaration) from the golden book
> in its native script and translate it into all three languages — closing DESIGN.md §15 open item #3.

---

## 0. One-paragraph brief

Today the tool fully extracts and translates **sūtras** (verses) but treats **vidhi** steps as opaque
one-line English descriptions. In `data/corpus/pratikraman-structure.json`, every `{ "type":"vidhi" }`
step carries only a `summary_en` (a human description of what happens) plus a `bookPages` pointer — it
has **no native text, no recitation line, and no translation**. But liturgically the ādeśas inside the
vidhi (e.g. *"Icchākāreṇa saṁdisaha bhagavan! Iriyāvahiyaṁ paḍikkamāmi?"*) are **spoken aloud**, exactly
like sūtras, and devotees need their native script + a recitation line + a translation. Your job: add a
deterministic-where-possible, Copilot-where-necessary pipeline — and a **dedicated tool mode** — that
(a) extracts each vidhi step's verbatim native ādeśa/direction text from the golden OCR, and (b) renders
an idiomatic translation + short plain-language explanation per the existing **vidhi translation policy**
(DESIGN.md §13; `data/tradition-knowledge/achhalgach.md` §5). Follow every architectural principle in
DESIGN.md: the book is the single golden source, never fabricate scripture, atomic Copilot calls, file-
based state, scopeable commands.

---

## 1. Read first (do not skip)

1. **`docs/DESIGN.md`** — the whole document. Pay special attention to:
   - §2 Architecture and §3 the **Code-vs-AI division table** (your new work must slot into it).
   - §8 Prompts table (markers + `{{PLACEHOLDER}}` convention) and §9 **Output schemas**.
   - §13 Tradition knowledge base + **the vidhi translation policy**.
   - §15 **Open items #3 and #4** (this task is #3; #4 is the website consumer).
   - §17 Recipes and §20 the structure tree.
2. **`data/tradition-knowledge/achhalgach.md` §5** — *"Vidhi (procedural connective text) — what it is
   and how to translate it"*. This is the authoritative policy. Quote it; do not invent a new one.
3. **The real code you will mirror** (read before writing):
   - `index.js` — the commander CLI; see how `translate` / `build-corpus` commands are wired
     (`bootstrap`, `parseLangs`, `closeLogger`, `--scope`).
   - `src/intelligence/translation-orchestrator.js` — the closest analog. Mirror its structure:
     `fill()` template substitution, `loadTraditionKnowledge()`, `invokeCopilotJson()` with markers,
     per-unit file paths, `force` handling, `isScopeMatch()`, `mergeGlossaries()`.
   - `src/copilot.js` — `invokeCopilotJson(prompt, { model, markers, retries })`; the semaphore; the
     `--attachment` flag (you do **not** need attachments — vidhi extraction reads golden **text**, not
     images).
   - `src/corpus/canonical-builder.js` — how sūtra verses are sliced from the golden pages and how
     `canonical.json` is written (header: `tradition`, `source`, `generatedAt`). Mirror its file shape.
   - `src/corpus/validator.js` — extend it.
   - `src/utils/slug.js` — `shlokaFileBase()` (`/` → `__`). Reuse for any id that contains `/`.
   - `prompts/translate-elaborate.md` and `prompts/sutra-preface.md` — mirror their tone, the
     `<<<NAME_START>>>/<<<NAME_END>>>` markers, the strict-JSON-between-markers rule, and the
     "target script only / IAST in translit" rules.
4. **The data you will read**: `data/corpus/pratikraman-structure.json` (the `pratikramans[].sequence[]`
   vidhi steps and the `sutras{}` registry), and `data/book/pages/page-NNN.txt` (the golden OCR text;
   **PDF page N = book page N + 18**, also encoded as `pageOffset: 18` in the structure tree).

---

## 2. The problem, concretely

A vidhi step in `pratikraman-structure.json` looks like this today:

```json
{ "type": "vidhi", "id": "devasi-iriya-adesh",
  "summary_en": "Adesh to perform iriyavahiyam; then recite iriyavahiyam, tassa uttari, annattha.",
  "bookPages": "21" }
```

`summary_en` is an English *description*. The actual spoken ādeśa — the words a devotee says aloud,
verbatim in Gujarati, e.g.

> *ઇચ્છાકારેણ સંદિસહ ભગવન્! ઇરિયાવહિયં પડિક્કમામિ?* … *ઇચ્છં.*

— exists **only** in the source book (`data/book/pages/page-003.txt`, book p.21) and has never been
pulled into structured, translatable data. So the website cannot show or translate it. We are NOT
changing the curated structure tree's vidhi steps; we are **adding** two new generated layers keyed by
the existing vidhi-step `id`s.

---

## 3. The data model (this is the spec — implement exactly)

Two new layers, mirroring how sūtras already have a canonical native layer (`canonical.json`) and a
per-(unit × lang) translation layer (`data/translations/...`).

### 3.1 Native extraction layer — `data/corpus/vidhi.json` (generated; book-verbatim)

One generated file (parallel to `canonical.json`), keyed by the structure tree's vidhi-step `id`. Each
step decomposes into an **ordered list of segments**; each segment is one utterance/instruction.

```jsonc
{
  "tradition": "achhalgach",
  "source": "data/book/panch-pratikraman.full.md (golden OCR of the printed book)",
  "generatedAt": "<ISO>",
  "steps": [
    {
      "vidhiId": "devasi-iriya-adesh",      // == structure tree step id
      "pratikraman": "devasi",
      "summary_en": "Adesh to perform iriyavahiyam; …",   // copied verbatim from the structure tree
      "bookPages": "21",
      "pdfPages": [3],                        // derived from bookPages via pageOffset
      "needsExtraction": false,               // true ⇒ Copilot could not locate native text; segments:[]
      "segments": [
        {
          "segmentId": "devasi-iriya-adesh/01",   // <vidhiId>/NN, NN sequential within the step
          "kind": "adesh",                          // "adesh" | "direction" | "formula"
          "speaker": "shishya",                     // "shishya" | "guru" | null  (null for directions)
          "native_script": "ઇચ્છાકારેણ સંદિસહ ભગવન્! ઇરિયાવહિયં પડિક્કમામિ?",
          "script": "gujarati",
          "source_ids": ["book"],
          "leadsToSutra": "iriyavahiyam"            // optional: sutraId this adesh introduces, or null
        }
        // … more segments (the guru reply "પડિક્કમેહ", the "ઇચ્છં", etc.)
      ]
    }
    // … one entry per vidhi step in every pratikraman's sequence
  ]
}
```

**Segment `kind` definitions (decide kind from the native text, not the summary):**
- `adesh` — a call-and-response declaration line (has a `speaker`). The disciple's request
  (*…paḍikkamāmi? / …karuṁ?*) and the guru's reply (*paḍikkameh / ṭhāuṁ*) are **separate** segments.
- `direction` — a "now recite X / do one Logassa kāyotsarga up to *chandesu nimmalayara* / substitute
  pakkhī→cāumāsī" instruction (no speaker).
- `formula` — a short fixed spoken formula said by the devotee (*Icchaṁ*, *Micchāmi dukkaḍaṁ*,
  *Tassa micchāmi dukkaḍaṁ*).

**`leadsToSutra`** — when an ādeśa names the sūtra it introduces, resolve that name against the
structure tree's `sutras{}` registry and store the `sutraId` (this powers a UI link). If none, `null`.

**Why a separate file (not editing the structure tree):** the structure tree is **hand-curated INPUT**
(DESIGN.md §3, §20) and the registry `build-corpus` consumes — the tool must not clobber it. `vidhi.json`
is a regenerable, hand-correctable artifact (like `canonical.json`), joined to the tree by `vidhiId`.

### 3.2 Translation layer — `data/translations/_vidhi/<vidhiId>.<lang>.json` (per vidhi × lang)

One file per (vidhi step × language). The step is the natural unit (its segments share context), so —
unlike per-shloka files — one file holds **all** segments of the step. Folder `_vidhi/` mirrors the
`_preface.<lang>.json` underscore convention. `vidhiId` is already filesystem-safe (no `/`).

```jsonc
{
  "vidhiId": "devasi-iriya-adesh",
  "targetLang": "gujarati",
  "targetScript": "gujarati",                 // latin | gujarati | devanagari
  "title": "ઇરિયાવહિયંનો આદેશ",                // short localized title for the step
  "summary": "…1–3 sentence plain-language explanation of what this step does and why…",
  "segments": [
    {
      "segmentId": "devasi-iriya-adesh/01",
      "recitation": "…the segment's native utterance in the TARGET SCRIPT, word-separated for chanting…",
      "plainMeaning": "…one simple sentence a newcomer understands…",
      "idiomaticTranslation": "…flowing, devotional/explanatory rendering…",
      "explanation": "…optional short procedural note: what the speaker is doing, the cue, the count…",
      "ritualTerms": [ { "term": "ādeśa", "gloss": "permission/command sought from the guru" } ]
    }
    // … one object per native segment, same order & ids as vidhi.json
  ],
  "sources": [ { "title": "…", "url": "…", "type": "dictionary|translation|reference", "consultedFor": "…" } ],
  "translatorConfidence": 0.0,
  "notes": "…uncertainties; mark anything not attested in the book/KB…"
}
```

**Per the vidhi policy (achhalgach.md §5): NO `wordByWord`, NO `etymology`, NO `partOfSpeech`.** Vidhi is
procedural, not a verse. Keep ritual terms (*ādeśa, kāyotsarga, khamāsamaṇa*) transliterated **into the
target script** with a parenthetical gloss (the `ritualTerms` array), and give an idiomatic translation +
short explanation. `recitation` is the **target script** (Gujarati for gujarati, Devanagari for hindi,
IAST/Latin for english) — a Hindi devotee who cannot read Gujarati needs the Devanagari chant line.

---

## 4. The new tool mode (CLI)

Add a dedicated command (DESIGN.md §15 #3). Mirror the `translate` command's option shape and `bootstrap`
lifecycle in `index.js`.

```
ppt vidhi [--extract] [--translate] [--scope <id>] [--lang <list>] [--force] [--max <n>]
```

- **`--extract`** — Phase A only: Copilot native extraction from the golden pages → write/refresh
  `data/corpus/vidhi.json`.
- **`--translate`** — Phase B only: Copilot translation of already-extracted steps →
  `data/translations/_vidhi/<vidhiId>.<lang>.json`.
- **Neither flag given ⇒ run both** (extract, then translate), like a full pass.
- **`--scope <id>`** — `all` (default), a `pratikramanId` (e.g. `devasi`), or a single `vidhiId`
  (e.g. `devasi-iriya-adesh`). Mirror `isScopeMatch()`.
- **`--lang <list>`** — `english,gujarati,hindi` or `all` (reuse `parseLangs`).
- **`--force`** — regenerate even if the artifact exists (idempotent + resumable otherwise: skip units
  whose output already exists, exactly like `translate`).
- **`--max <n>`** — cap units per pass for cheap iteration (like `translate --max`).

Also extend **`ppt status`** to report vidhi coverage (steps extracted / total; per-language translation
counts; steps flagged `needsExtraction`), alongside the existing sūtra coverage.

---

## 5. Implementation plan (files to add / edit)

Mirror the existing module boundaries (DESIGN.md §3 table). Add a new **"Vidhi extraction"** and
**"Vidhi translation"** row to that table in `docs/DESIGN.md` when done.

**Add:**
- `src/intelligence/vidhi-orchestrator.js` — the orchestrator. Exposes
  `extractVidhiScope({ structure, scope, config, force, max })` and
  `translateVidhiScope({ structure, vidhi, scope, langs, config, force, max })`. Reuse
  `invokeCopilotJson`, the copilot semaphore, `loadTraditionKnowledge()`, `fill()`, and the logger —
  copy these patterns from `translation-orchestrator.js` (extract shared helpers if cleaner).
- `prompts/extract-vidhi.md` — Phase A prompt. Markers `<<<VIDHI_START>>>` / `<<<VIDHI_END>>>`.
  Inputs (via `{{PLACEHOLDER}}`): the step `id`, `summary_en`, `bookPages`; the **verbatim golden page
  text** for those book pages (sliced by the orchestrator from `data/book/pages/page-NNN.txt`); the
  neighboring sequence steps (so the model knows which sūtra precedes/follows); and the **sutra registry**
  (id → name_native/name_translit) so it can fill `leadsToSutra`. Output: the `segments[]` for that one
  step, strictly between the markers.
- `prompts/translate-vidhi.md` — Phase B prompt. Markers `<<<VIDHI_TR_START>>>` / `<<<VIDHI_TR_END>>>`.
  Inputs: the step's native `segments[]` (from `vidhi.json`), `summary_en`, `{{TARGET_LANG}}`,
  `{{TARGET_SCRIPT}}`, and `{{TRADITION_KNOWLEDGE}}`. Bake in the vidhi policy verbatim. Output: the
  per-(vidhi × lang) JSON in §3.2, strictly between the markers.

**Edit:**
- `index.js` — register the `vidhi` command; extend `status`.
- `src/corpus/validator.js` — add `validateVidhi(structure, vidhi)` (see §7).
- `docs/DESIGN.md` — update §3 (table), §9 (add the two new schemas), §15 (mark #3 done; note the new
  command), and §8 (add the two prompts to the prompts table).
- `README.md` — document `ppt vidhi` in the command list / quick start.

**Golden-page slicing (deterministic helper, in code not Copilot):** given a step's `bookPages`
(`"21"` or `"54-55"`), map to PDF page(s) via `pageOffset` (book page = pdf page + 18 ⇒ pdf page =
book page − 18) and read the corresponding `data/book/pages/page-NNN.txt` file(s). Pass that text to the
extract prompt. Do **not** ask Copilot to guess page contents — always feed it the real golden text.

---

## 6. Phase A — native extraction specifics

- **Verbatim fidelity (non-negotiable).** `native_script` must be copied **exactly** from the golden OCR
  — same orthography, mātrās, daṇḍas, and the book's inconsistencies (achhalgach.md §7). Never normalize,
  never "correct", never translate in this phase. If a passage is illegible/missing in the golden text,
  set `needsExtraction: true`, `segments: []`, and explain in a `notes` field — never fabricate.
- **Segmentation.** Split the step's prose into ordered segments at speaker turns and instruction
  boundaries. A disciple request and the guru's reply are two segments. A "now recite X" cue is a
  `direction`. Short spoken formulas (*Icchaṁ*) are `formula`.
- **`leadsToSutra`.** If a segment names a sūtra that follows (matchable to the registry), set its
  `sutraId`; else `null`. Be conservative — only when the text actually names it.
- **Idempotent & resumable.** Skip steps already present in `vidhi.json` unless `--force`. Merge by
  `vidhiId` (don't drop hand-corrections to other steps).
- **Script check.** The orchestrator (or validator) should warn if `native_script` is < ~85% Gujarati
  (catches a model that translated instead of transcribing).

## 7. Phase B — translation specifics

- Obey the **vidhi translation policy** (achhalgach.md §5; DESIGN.md §13) verbatim: idiomatic translation
  + short plain-language explanation; ritual terms transliterated **into the target script** with a
  parenthetical gloss; **no** word-by-word, etymology, or part-of-speech.
- **Target-script discipline** identical to `translate-elaborate.md`: all target-language fields in the
  target script; `recitation` in the target script (IAST only for english); never mix ASCII + diacritics.
- **Do not restate** what `summary`/the KB already says across every segment; keep segment `explanation`
  tight and specific to that utterance.
- **Sources.** The translation prompt may web-fetch (via the same `--allow-all` path the sūtra prompt
  uses) to verify a ritual term, but must not hallucinate citations — omit unverifiable ones.
- **Write-once + force.** Skip `(vidhiId × lang)` whose file exists unless `--force` (mirror
  `ensurePreface`/`translateOne`).

## 8. Prompt-authoring conventions (match the existing prompts)

- `{{PLACEHOLDER}}` substitution via the orchestrator's `fill()`.
- Strict JSON **only** between `<<<…_START>>>` / `<<<…_END>>>` markers — nothing else in the output.
- Inject `{{TRADITION_KNOWLEDGE}}` (from `loadTraditionKnowledge()`) into the **translate** prompt so the
  model shares the same authoritative context as the sūtra pipeline.
- Use `config.copilotModelLarge`, `markers`, and `retries: 1` in `invokeCopilotJson`, exactly as the
  sūtra orchestrator does.

---

## 9. Validation & acceptance criteria (must pass)

Extend `src/corpus/validator.js` with `validateVidhi(...)` and wire a check into the `vidhi` command
(and `ppt status`). Assert:

1. **Coverage.** Every `{ type:"vidhi" }` step id in every `pratikramans[].sequence[]` of
   `pratikraman-structure.json` has an entry in `vidhi.json` (or is explicitly `needsExtraction`).
2. **Native integrity.** For each non-`needsExtraction` step: `segments[]` is non-empty; every segment
   has non-empty `native_script`, a valid `kind`, sequential `segmentId` = `<vidhiId>/NN`,
   `source_ids:["book"]`; Gujarati script ratio ≥ ~85%.
3. **Links resolve.** Every non-null `leadsToSutra` exists in the structure tree's `sutras{}` registry.
4. **Translation integrity.** Each present `_vidhi/<vidhiId>.<lang>.json` parses; its `segments[]` align
   1:1 (same ids, same order) with `vidhi.json`; required fields present; target-script ratio ≥ ~85% for
   gujarati/hindi; english `recitation` is Latin/IAST.
5. **No fabrication.** No segment exists that isn't grounded in the golden page text for that step's
   `bookPages` (spot-check during quality iteration).
6. **Idempotency.** Re-running `ppt vidhi` without `--force` makes no changes and exits cleanly.

Then **manually verify** the probe (see §11): `devasi-iriya-adesh` extracts the Iriyāvahiyaṁ ādeśa
call-and-response verbatim, links to `iriyavahiyam`, and translates cleanly in all three languages with a
chant-ready `recitation` and a correct `explanation`.

## 10. Quality iteration loop (mirror DESIGN.md §10)

1. `ppt vidhi --extract --scope devasi-iriya-adesh` → inspect `vidhi.json` segments against the source text
   (`data/book/pages/page-003.txt`, book p.21). Fix segmentation/`leadsToSutra` issues by strengthening
   `prompts/extract-vidhi.md` (not by hand-editing data, except genuine OCR corrections to the golden
   page).
2. `ppt vidhi --translate --scope devasi-iriya-adesh --lang english` → check the policy is honored
   (idiomatic + explanation, no word-by-word, ritual-term glosses, target script).
3. Iterate the two prompts until a 2–3 step sample is clean in all three languages.
4. Lock the prompts (commit), then run `ppt vidhi --scope devasi`, review, then `--scope all`.
5. Optionally extend `prompts/quality-grader.md` / `quality-grader.js` with a vidhi rubric (idiomatic
   accuracy, policy compliance, script correctness, no fabrication) — nice-to-have, not required for MVP.

---

## 11. First steps for you (the new session)

1. Read `docs/DESIGN.md` (esp. §3, §9, §13, §15, §20) and `data/tradition-knowledge/achhalgach.md` §5.
2. Count the vidhi steps you must cover: enumerate every `{ "type":"vidhi" }` across
   `pratikramans[].sequence[]` in `pratikraman-structure.json` (Devasi, Rāi, Pakkhī each have several;
   Cāumāsī/Sāṁvatsarī have none — they are `basedOn:"pakshik"`). That count is your Phase-A universe.
3. Build the deterministic golden-page slicer + `src/intelligence/vidhi-orchestrator.js` + the two
   prompts; wire the `ppt vidhi` command and `status`.
4. Probe on `devasi-iriya-adesh` (the Iriyāvahiyaṁ ādeśa) end-to-end in all three languages; iterate the
   prompts to quality; then widen scope to `devasi`, then `all`.
5. Extend the validator; run it; fix everything. Update `docs/DESIGN.md` (§3/§8/§9/§15) and `README.md`.

---

## 12. Guardrails (DESIGN.md §1, §14 — do not violate)

- **The book is the single golden source.** Vidhi `native_script` is **copied verbatim** from
  `data/book/pages/*.txt`. Never fabricate, normalize, or web-source ritual text. Missing ⇒
  `needsExtraction`, never filled.
- **Do not modify** `data/corpus/pratikraman-structure.json` (curated INPUT), `data/book/**`, `index.js`'s
  unrelated commands, the sūtra pipeline, or the website under `website/`. You are **adding** the
  `vidhi.json` + `_vidhi/` layers and the `ppt vidhi` command.
- **Atomic Copilot calls, file-based state, scopeable, idempotent/resumable** — exactly like the sūtra
  pipeline. Web access is **translation-only**.
- **Respect the existing schemas & conventions** (markers, `{{PLACEHOLDER}}`, `shlokaFileBase`, target-
  script rules, tradition-KB injection).

---

## 13. Downstream contract (the website will consume this — emit it stably)

The website's data-sync (`website/scripts/sync-data.mjs`) and its `VidhiCard`
(`website/src/components/SequenceSteps.tsx`) are already built to slot in `native` + `translations`
without a rewrite. To make that trivial, the shapes in §3.1 and §3.2 are the contract. When the website
team wires it up, the per-pratikraman bundle will join, by `vidhiId`:
`structure-tree step → vidhi.json.segments[] → _vidhi/<vidhiId>.<lang>.json.segments[]`, so each vidhi
card can show the native ādeśa, a target-script recitation, an idiomatic translation, a short
explanation, and (via `leadsToSutra`) a link into the named sūtra. **Do not** change those field names
once you ship them, or you break that consumer. (Wiring the website itself is out of scope for this
task — it is DESIGN.md §15 open item #4 — but keeping the contract stable is in scope.)

Build this to the same standard as the rest of the tool: deterministic where it can be, one atomic
Copilot call per unit where it must be, book-verbatim, fully scopeable, and resumable. The ādeśas are
spoken aloud — give them the same dignity of treatment the sūtras already get.
