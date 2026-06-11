# Panch Pratikraman Translator & Elaborator — Design

> Single source of truth. Read this end-to-end before changing code or running the tool.
> **Status:** v1.0 — shipped. **The single golden source is a scanned printed book** (`input/panch_pratikraman.pdf`), OCR'd verbatim into `data/book/`. Web discovery/scraping was **removed** as a source of scripture (it failed for this tradition); web access is retained **only** to aid translation/commentary. The full corpus (90 pages → 5 pratikramans → 38 unique sutras → 285 shlokas) is built deterministically from the book; **all 285 extracted shlokas (21 sūtras) and all 10 vidhi steps are translated in all three languages** (English, Gujarati, Hindi). (17 prose/formula sūtras remain flagged `needsVerseExtraction` — see §15.) The corpus is **published as a live website** (React + TypeScript + Vite, deployed to GitHub Pages); the A4 PDF is the complementary download. The corpus is committed under `data/` (translations, canonical, vidhi, glossaries) so the website and CI build with **zero pipeline runs**. See §14 (Data Integrity), §20 (OCR pipeline), §5.10 (translation pipeline), and §21 (website & deployment).

---

## 1. Goals

Produce a print-ready, large-font A4 PDF — and a website-ready data tree — containing every shloka of the **Pancha Pratikramana sutras** of the **Achhalgach** (Achalgachchha / Anchalgachchha / Aanchalagaccha / **Vidhipaksha Gaccha**) Shvetambara Murtipujak Jain tradition, with:

1. The shloka in its authoritative native script (Gujarati), exactly as printed in the **book**, with a target-script **recitation** line for chanting.
2. A layered, every-audience rendering: a one-line **plain meaning** for newcomers, a **word-by-word** gloss, and full translations in three languages — **English** (Latin), **Gujarati** (Gujarati script), **Hindi** (Devanagari).
3. An acharya-grade elaboration in each language: verse-by-verse commentary, doctrinal context, practical relevance, cross-references, and verified sources — plus a write-once **sutra preface** (summary, ritual placement, verse arc, recurring imagery, glossary) so shared framing is never repeated per verse.
4. Sutras presented in the **canonical recitation order** actually used in an Achhalgach Pancha Pratikraman, with the **vidhi** (procedural text) interleaved — captured in `data/corpus/pratikraman-structure.json`.

**Delivered (v1.0).** All four layers above exist for the entire corpus in all three languages (sūtras and vidhi), and two delivery targets are built on top of the same static JSON: a **live website** (the primary experience — see §21) and the **A4 print PDF** (the complementary download). Both are pure renderers over the generated artifacts; neither requires re-running the pipeline.

### Design principles
- **The book is the single golden source.** Every sutra and every vidhi line comes from the scanned, OCR'd, hand-verified book (`data/book/panch-pratikraman.full.md`). The tool **never** fabricates scripture and **no longer** discovers or scrapes sources from the web.
- **Code for deterministic work, Copilot CLI for intelligence.** OCR rasterization, verse parsing, corpus building, schema/script validation, HTML/CSS rendering, PDF merging, CLI, semaphores, logs = pure Node.js/Python. **OCR transcription** (one Copilot vision call per page), **per-shloka/vidhi translation+elaboration**, and **quality grading** = GitHub Copilot CLI (`claude-opus-4.8`, `high`/`xhigh` reasoning, `long_context`/1M window). Web fetch (via `--allow-all`) is used **only** by the translation/grading prompts.
- **Atomic Copilot calls.** Each Copilot invocation answers ONE question and writes ONE artifact (one OCR page, one (shloka × language) translation), so failures isolate to a single unit and the orchestrator retries/resumes per unit.
- **Aggressive parallelization.** Independent units (per page, per (shloka × language)) run concurrently under a semaphore.
- **Shared system knowledge.** A curated tradition-knowledge document (`data/tradition-knowledge/achhalgach.md`), grounded entirely in the book, is injected into every translation prompt so no per-shloka session improvises ritual placement or doctrine (see §13).
- **File-based state.** Everything is JSON / HTML / PDF / Markdown on disk under `data/`. No DB.
- **Scopeable.** A `--scope` flag scopes every pipeline command to one sutra or one shloka, enabling fast end-to-end iteration before running the full corpus.

---

## 1A. Prerequisites

- **Node.js** ≥ 18 (ESM). Tested on Node 20 on Windows.
- **Python 3** with **PyMuPDF** (`pip install PyMuPDF`) — for rasterizing the scanned PDF into page tiles (OCR only).
- **GitHub Copilot CLI** installed and authenticated. `where copilot` (Windows) / `which copilot` must resolve. The CLI must support `--attachment <path>` (image input) for OCR. Verify:
  ```powershell
  copilot --help        # confirm --reasoning-effort, --context, and --attachment flags
  ```
- **Indic system fonts** for correct rendering and PDF generation:
  - Windows: Mangal (Devanagari), Shruti (Gujarati) — bundled with Windows.
  - Recommended additions: **Noto Sans Devanagari**, **Noto Sans Gujarati** (free from Google Fonts) for superior conjunct shaping.
- **Puppeteer** ships its own Chromium on `npm install`; no separate browser needed.
- **The website** (`website/`) also needs Node ≥ 18; run `cd website && npm install` once. It is self-contained — it builds from the committed `data/` with **no pipeline run** (the Copilot CLI / Python are only needed to regenerate the corpus).
- Disk: each (shloka × language) translation is ~15–25 KB JSON (the committed `translations/**` is a few MB total); the page tiles are ~62 MB and the scanned PDF ~44 MB (both gitignored).

## 1B. Quick start (zero-to-first-translation)

```powershell
# 1. Clone and install
cd C:\Repos\Panch.Pratikraman
npm install

# 2. Configure
Copy-Item config.example.txt config.txt
# (edit config.txt only if changing model, concurrency, or dataDir)

# 3. Sanity-check Copilot CLI
copilot -p "say hello" -s --no-ask-user --allow-all --model claude-opus-4.8

# 4. (one-time) OCR the scanned book -> golden text, then assemble it.
#    Tiles + 90 page transcriptions already live under data/book/ if done.
node index.js ocr                       # rasterize + transcribe (one Copilot vision call/page)
node index.js assemble                  # build data/book/panch-pratikraman.full.md

# 5. The tradition knowledge base and structure tree are curated from the book:
#    data/tradition-knowledge/achhalgach.md          (see §13)
#    data/corpus/pratikraman-structure.json          (the recitation tree, see §20)

# 6. Build the corpus + translate
node index.js build-corpus                                     # deterministic canonical.json from the book
node index.js translate --scope nandisutrani-pratham-sajay     # 1 sutra, all 3 langs
node index.js status                                           # verify coverage

# 7. Preview the website (the corpus is already committed — no pipeline run needed)
cd website
npm install
npm run dev            # `predev` syncs ../data into the bundle, then starts Vite
```

---

## 2. Architecture

```
                       ┌──────────────────────────────────────────┐
                       │               CLI (index.js)             │
                       │ ocr  assemble  build-corpus  translate   │
                       │ grade  render  build-pdf  status         │
                       │ logs  iterate                            │
                       └─────────┬───────────────────┬────────────┘
                                 │                    │
        ┌────────────────────────┘                    └──────────────────────┐
        ▼                                                                     ▼
┌──────────────────────────────┐                      ┌────────────────────────────┐
│      Pure-code modules       │                      │   Intelligence (Copilot CLI)│
│                              │                      │                             │
│ corpus/book-parser.js        │   golden book ─────▶ │ scripts/ocr-orchestrator    │
│ corpus/canonical-builder.js  │                      │   (1 vision call / page)     │
│ corpus/validator.js          │                      │ intelligence/translation-orch│
│ render/{shloka,sutra,pdf}    │                      │ intelligence/quality-grader │
│ utils/{logger,unicode,slug,  │                      └─────────────┬───────────────┘
│        temp-files}           │                                    │
│ semaphore.js · config.js     │                      ┌─────────────▼───────────────┐
│ scripts/rasterize.py         │                      │       src/copilot.js         │
│ scripts/assemble-book.mjs    │                      │ spawn · --attachment · markers│
└──────────────────────────────┘                      │ json · semaphore · retry      │
        ▲                                              └───────────────────────────────┘
        │   data/book/  (golden OCR: pages/*.txt, full.md, ocr-manifest.json)
        │   data/corpus/pratikraman-structure.json  (recitation tree; sutra registry)
        │   data/tradition-knowledge/achhalgach.md  (injected into every translation prompt)
        └────────────────────────────────────────────────────────────────────────────────
```

**One input feeds the corpus: the book.** `input/panch_pratikraman.pdf` → (`ocr`) → `data/book/pages/page-NNN.txt` → (`assemble`) → `data/book/panch-pratikraman.full.md`. The hand-curated `data/corpus/pratikraman-structure.json` defines the recitation order + sutra registry; `build-corpus` extracts each sutra's verses from the golden pages and writes `data/corpus/canonical.json`. There is **no web discovery, scraping, or multi-source reconciliation** anymore.

**Two delivery targets consume the same artifacts.** The generated `data/` tree (canonical corpus + per-(shloka × lang) translations + prefaces + vidhi + glossaries + structure tree) is the single substrate for both outputs:

```
  data/ ──┬──▶  website/scripts/sync-data.mjs  ──▶  website/public/data/*.json  ──▶  React app (Vite) ──▶  GitHub Pages   (§21, primary)
          └──▶  src/render/* (puppeteer + pdf-lib)  ──▶  data/pdfs/…(final A4 PDF)                                  (complementary)
```

The **website** is the primary experience; it is rebuilt with one command (`npm run sync-data`) whenever the pipeline emits or updates JSON, and is published automatically by CI on every push (§21). The **PDF** path (`ppt render` + `ppt build-pdf`) is unchanged and produces the downloadable volume.

---

## 3. Code vs AI division

| Layer | Module | Method | Why |
|---|---|---|---|
| PDF → page tiles | `scripts/rasterize.py` (PyMuPDF) | Code | Deterministic raster |
| Per-page OCR transcription | `scripts/ocr-orchestrator.mjs` → `src/copilot.js` (`--attachment`) | Copilot CLI (vision) | 1 fresh process/page; parallel |
| Golden-text assembly | `scripts/assemble-book.mjs` | Code | Deterministic concat |
| Recitation tree + sutra registry | `data/corpus/pratikraman-structure.json` | Human-curated from book | Authoritative structure |
| Verse extraction from golden pages | `src/corpus/book-parser.js` | Code | Deterministic `॥N॥` parse |
| Canonical corpus build | `src/corpus/canonical-builder.js` | Code | Deterministic, from book |
| Schema / script / ordering validation | `src/corpus/validator.js` + `src/utils/unicode.js` | Code | Deterministic checks |
| Per-sutra preface (write-once framing) | `src/intelligence/translation-orchestrator.js` → `prompts/sutra-preface.md` | Copilot CLI — 1 call per (sutra × lang) | Shared context, written once |
| Per-shloka translation + elaboration | `src/intelligence/translation-orchestrator.js` | Copilot CLI — 1 call per (shloka × lang) | Pure intelligence (may web-fetch) |
| Glossary merge | `src/intelligence/translation-orchestrator.js` (`mergeGlossaries`) | Code | Dedupe preface glossaries |
| Golden-page slicing for vidhi | `src/intelligence/vidhi-orchestrator.js` (`bookPagesToPdfPages` + page-text load) | Code | Deterministic `bookPages`→pdf-page→golden-text feed |
| Vidhi/ādeśa native extraction | `src/intelligence/vidhi-orchestrator.js` → `prompts/extract-vidhi.md` | Copilot CLI — 1 call per vidhi step | Verbatim transcription + segmentation of procedural text |
| Vidhi translation | `src/intelligence/vidhi-orchestrator.js` → `prompts/translate-vidhi.md` | Copilot CLI — 1 call per (vidhi × lang) | Idiomatic + short explanation per the vidhi policy (§13) |
| Quality grading | `src/intelligence/quality-grader.js` | Copilot CLI | Subjective rubric |
| Tradition-knowledge authoring | `data/tradition-knowledge/<tradition>.md` | Human-curated from book | Authoritative, locked once |
| HTML rendering | `src/render/shloka-renderer.js`, `sutra-renderer.js` | Code | Templated |
| PDF generation + merge | `src/render/pdf-builder.js` (puppeteer + pdf-lib) | Code | Library |
| CLI, semaphores, logs, state | `index.js`, `src/copilot.js`, `src/semaphore.js`, `src/utils/logger.js`, `src/config.js` | Code | Deterministic |

---

## 4. Project structure

```
Panch.Pratikraman/
├── index.js                      # CLI (commander) — 11 commands
├── package.json
├── config.example.txt            # copy → config.txt (config.txt is gitignored)
├── README.md
├── docs/DESIGN.md                # this file
├── .github/workflows/
│   └── deploy-pages.yml          # CI: sync-data → validate → build → deploy to GitHub Pages
├── input/
│   ├── README.md                 # how to obtain the book (the PDF itself is gitignored)
│   └── panch_pratikraman.pdf     # THE golden source: the scanned book (90 pages, gitignored)
├── scripts/
│   ├── rasterize.py              # PDF → overlapping page tiles (PyMuPDF)
│   ├── ocr-orchestrator.mjs      # 1 Copilot vision call/page → pages/*.txt
│   ├── assemble-book.mjs         # pages/*.txt → full.md + mark manifest verified
│   └── ocr-conventions.md        # shared OCR spec
├── prompts/
│   ├── ocr-page.md               # per-page OCR prompt (consumes 2 image tiles)
│   ├── sutra-preface.md          # write-once sutra-level framing + glossary
│   ├── translate-elaborate.md    # the heart; per-verse; consumes the KB + the preface
│   └── quality-grader.md
├── templates/
│   └── print.css                 # large-font A4 print stylesheet
├── src/
│   ├── config.js                 # config parse + ensureDataDirs
│   ├── copilot.js                # spawn + --attachment + markers + json + sem
│   ├── semaphore.js
│   ├── utils/{logger.js, temp-files.js, unicode.js, slug.js}
│   ├── corpus/{book-parser.js, canonical-builder.js, validator.js}
│   ├── intelligence/{translation-orchestrator.js, vidhi-orchestrator.js, quality-grader.js}
│   └── render/{shloka-renderer.js, sutra-renderer.js, pdf-builder.js}
├── data/
│   ├── book/                              # GOLDEN SOURCE
│   │   ├── tiles/page-NNN-{top,bottom}.jpg     # rasterized (gitignored, ≈62 MB)
│   │   ├── pages/page-NNN.{txt,meta.json}      # verbatim OCR per page (committed)
│   │   ├── panch-pratikraman.full.md           # assembled golden text (committed)
│   │   └── ocr-manifest.json                   # per-page status (committed)
│   ├── corpus/pratikraman-structure.json  # INPUT: recitation tree + sutra registry (committed)
│   ├── corpus/canonical.json              # generated by build-corpus (committed — website + CI need it)
│   ├── corpus/vidhi.json                   # generated by `vidhi --extract` (committed)
│   ├── tradition-knowledge/<tradition>.md # INPUT: shared system knowledge (committed)
│   ├── glossary/pos-labels.json           # INPUT: localized part-of-speech labels (committed)
│   ├── glossary/{english|gujarati|hindi}.json  # generated, deduped from prefaces (committed)
│   ├── translations/<sutraId>/_preface.{english|gujarati|hindi}.json  # write-once framing (committed)
│   ├── translations/<sutraId>/<shlokaId_safe>.{english|gujarati|hindi}.json   # (committed)
│   ├── translations/_vidhi/<vidhiId>.{english|gujarati|hindi}.json            # (committed)
│   ├── quality/<timestamp>.report.json    # generated by `grade` (gitignored)
│   ├── html/per-sutra/<sutraId>.html      # generated by `render` (gitignored)
│   ├── pdfs/…                              # generated by `render` / `build-pdf` (gitignored)
│   └── logs/<cmd>-<timestamp>.log         # (gitignored)
└── website/                          # the published site (React + TypeScript + Vite) — see §21
    ├── package.json                  # dev/start (predev syncs) · build · sync-data · validate · deploy
    ├── vite.config.ts                # base '/Panch.Pratikraman/' for the GitHub Pages project site
    ├── scripts/sync-data.mjs         # build website/public/data/ from ../data   (npm run sync-data)
    ├── scripts/validate-data.mjs     # assert the synced bundle is consistent     (npm run validate)
    ├── public/data/                  # generated bundle (gitignored; rebuilt by sync-data)
    └── src/{pages,components,state,…} # HashRouter app; 3-language UI; client-side search
```

**What's committed under `data/`** (so the website and CI build with **zero pipeline runs**): the golden OCR (`book/pages/*`, `panch-pratikraman.full.md`, `ocr-manifest.json`), the curated `corpus/pratikraman-structure.json`, the generated-but-committed `corpus/canonical.json` + `corpus/vidhi.json`, the three per-language glossaries + `glossary/pos-labels.json`, `tradition-knowledge/*`, and **all of `translations/**`** (sūtra + vidhi). **Gitignored** (large, temporary, or regenerable on demand): the scanned PDF (`input/*.pdf`), `book/tiles/`, `quality/`, `html/`, `pdfs/`, `logs/`, `config.txt`, every `node_modules/`, and the website's generated `public/data/` + `dist/`. See [.gitignore](../.gitignore) and §21.

---

## 5. Low-level module details

### 5.1 `src/copilot.js`
- `initCopilot({ concurrency, model, modelLarge, reasoning, contextTier })` initializes a `Semaphore` and stashes default flags.
- `invokeCopilot(prompt, opts)` / `invokeCopilotJson(prompt, opts)`:
  1. Acquire semaphore.
  2. Write `prompt` to a temp `.md` file (avoids the Windows 8191-char cmdline limit); reference it inline as `@<tempfile>`.
  3. Resolve `copilot` binary (Windows-aware, prefers npm-installed `.cmd`).
  4. Build cmd: `copilot -p "<inline @tempfile>" -s --no-ask-user --no-custom-instructions --allow-all [--attachment <img> ...] [--model M] [--reasoning-effort high] [--context long_context]`.
  5. Spawn under `cmd.exe /s /c` on Windows with `windowsVerbatimArguments`, else direct exec. **stdin is closed** (`child.stdin.end()`) — required, or the CLI hangs / returns empty.
  6. Capture stdout, extract content between `markers.start` / `markers.end` (picks the **largest span** if the markers appear more than once); JSON variant additionally parses + repairs unescaped control chars.
  7. Retry on failure (default 1 retry = 2 attempts). Cleanup temp file in `finally`.
- **`--attachment <path>`** (added v0.2): attach one or more image/document files to the prompt. Used by the OCR orchestrator to pass each page's two image tiles. `opts.attachments: string[]` → one `--attachment "<path>"` per entry, order preserved.
- **Flag reality (verified against installed CLI):** the model is `claude-opus-4.8`; reasoning is `--reasoning-effort <level>` (NOT `--reasoning`); the 1M window is `--context long_context`; image input is `--attachment`; web access is the built-in fetch tool enabled by `--allow-all` (there is NO `--web-search` flag). **All flag names live only in `buildCmd` — change them in one place.**

### 5.2 `src/semaphore.js`
Promise-based counting semaphore. Used for: Copilot CLI processes (default 6, shared by OCR + translation + grading) and the puppeteer PDF pool (4, internal to `pdf-builder.js`).

### 5.3 `scripts/rasterize.py` (OCR step 1)
- PyMuPDF renders each page of `input/panch_pratikraman.pdf` into **two overlapping JPEG tiles** (top/bottom, long edge 1568 px, ~6% overlap) under `data/book/tiles/`, and writes `data/book/ocr-manifest.json`. Tiles are sized so a multimodal model sees crisp Gujarati conjuncts without downsampling a full page.

### 5.4 `scripts/ocr-orchestrator.mjs` (OCR step 2) ⭐
- One `copilot` process **per page**, with the page's two tiles attached (`--attachment`), running `prompts/ocr-page.md`; parses the `<<<OCR_START/END>>>` JSON and writes `data/book/pages/page-NNN.{txt,meta.json}`. Parallel under the copilot semaphore. Idempotent (`missing` spec skips done pages); per-page try/catch; flags `uncertain` glyphs. This is the pattern that fixed OCR throughput: a fresh multimodal context per page instead of accumulating images in one session.

### 5.5 `scripts/assemble-book.mjs` (OCR step 3)
- Concatenates all `page-NNN.txt` into the page-marked golden document `data/book/panch-pratikraman.full.md` and marks every page `verified` in the manifest. Re-runnable.

### 5.6 `src/corpus/book-parser.js`
- Deterministic verse extractor for the golden pages. Headings/colophons start with `॥`/`।।` and do **not** end with a numeric marker; verses use a single danda `।` mid-line and end with `॥ N ॥` (matched non-anchored, so trailing `॥ ઇતિ ॥` and metre labels like `॥ ગાહા ॥` are ignored); Navkar-style trailing tab+digit is also handled. `segmentByHeadings()` splits a page range into sections; `extractSutraVerses(dataDir, pdfPages, headingNeedles)` returns the verses for the section matching a heading needle. Never normalizes Gujarati — the book is verbatim truth.

### 5.7 `src/corpus/canonical-builder.js` (replaces the old reconciler)
- `buildCanonical(config)`: reads `data/corpus/pratikraman-structure.json`, computes the canonical sutra order (first appearance across the pratikraman sequences, then appendix), extracts each sutra's verses from the golden pages via a per-sutra `HEADING_NEEDLES` map, and writes `data/corpus/canonical.json`. ShlokaIds are sequential `1..N` within a sutra (unique even when the book restarts numbering per sub-section/dhala); the book's printed number is kept as `printedNumber`. Sutras with no numbered verses (prose/lists/single formulas) are emitted with `needsVerseExtraction: true`. `loadCanonical(config)` reads it back.

### 5.8 `data/corpus/pratikraman-structure.json` (the recitation tree)
- Hand-curated from the golden book; the website backbone and the registry the canonical builder consumes. Contains `sutras{<id>:{name_*, kind, bookPages, pdfPages, gathaCount?, role, usedIn}}`, `pratikramans[]` each with an ordered `sequence` of `{type:"vidhi"|"sutra"}` steps, and the `avashyakas`/`appendix`. `chaumasi`/`samvatsari` use `basedOn:"pakshik"` + `overrides{wordSubstitution, kausagga}` (the book defines them by reference). See §20.

### 5.9 `src/corpus/validator.js`
- Pure code: schema, duplicate-id detection, contiguous ordering, declared-vs-detected script mismatch (via `utils/unicode.js`).

### 5.10 `src/intelligence/translation-orchestrator.js`  ⭐ (the heart)
`translateScope({ canonical, scope, langs, config, force, max })` runs a **four-phase** pipeline so that shared, sutra-level framing is written **once** and never repeated per verse:

1. **Plan.** Walk the canonical corpus; for each in-scope `(shloka × lang)` not already on disk (unless `--force`), queue it and note which `(sutra × lang)` **prefaces** are needed.
2. **Prefaces** (`ensurePreface`). For each needed `(sutra × lang)`, fill `prompts/sutra-preface.md` with the **whole sutra** (all verses) and invoke Copilot once, writing `data/translations/<sutraId>/_preface.<lang>.json`. The preface owns ritual placement, author/source, the verse-by-verse arc, recurring imagery (e.g. the Saṅgha-as-city/chariot/lotus system), a beginner `summary`, a `howToRead` note, and a per-sutra `glossary`. Idempotent (reused from disk unless `--force`). Parallel under the copilot semaphore.
3. **Per-shloka translation** (`translateOne`). For each queued verse, fill `prompts/translate-elaborate.md` with the shloka (+ prev/next for context), the **injected tradition KB**, **the sutra's preface JSON**, and the preface's glossary-term list — with explicit instructions NOT to restate anything the preface already covers. Writes one JSON per `(shloka × lang)`. Parallel under the copilot semaphore; failures isolate per unit.
4. **Glossary merge** (`mergeGlossaries`). Dedupe every preface's `glossary[]` across sutras into `data/glossary/<lang>.json` (keyed by IAST `term`, keeping the longest definition and the list of contributing sutras).

- **Tradition-KB injection** (`loadTraditionKnowledge`): reads `data/tradition-knowledge/<tradition>.md` into `{{TRADITION_KNOWLEDGE}}` for both the preface and per-shloka prompts. Missing file → a guard string forbids inventing placement.
- **Skip-if-exists** unless `--force`; `--max N` caps shlokas per pass. `shloka.printedNumber` (the book's number) is what the prompt sees; the filesystem id stays sequential.

### 5.10b `src/intelligence/vidhi-orchestrator.js`  ⭐ (the vidhi pipeline)
Extracts and translates the book's **vidhi** (procedural connective text: ādeśa call-and-response declarations and "now recite X" directions) — the layer the sūtra pipeline skips. Two phases, each one atomic Copilot call per unit, mirroring `translation-orchestrator.js`:

- **Phase A — `extractVidhiScope({ structure, scope, config, force, max })`.** Enumerates every `{type:"vidhi"}` step across the structure tree's `pratikramans[].sequence[]` (`enumerateVidhiSteps`). For each in-scope step not already in `vidhi.json` (unless `--force`), it **deterministically slices the golden pages** (`bookPagesToPdfPages` maps `bookPages`→pdf pages via `structure.pageOffset`, then the real `page-NNN.txt` text is loaded — Copilot is fed the golden text, never asked to guess it) and fills `prompts/extract-vidhi.md`. The model returns the step's ordered `segments[]`; the orchestrator re-derives the deterministic identity fields (`segmentId = <vidhiId>/NN`, `script`, `source_ids`), normalizes `kind`/`speaker`, and drops any `leadsToSutra` not in the registry. Steps merge by `vidhiId` into `data/corpus/vidhi.json` (hand-corrections to other steps are preserved). Verbatim-only: a step the model cannot locate is written `needsExtraction:true` + empty `segments`, never fabricated.
- **Phase B — `translateVidhiScope({ structure, vidhi, scope, langs, config, force, max })`.** For each in-scope extracted step × language not already on disk (unless `--force`), fills `prompts/translate-vidhi.md` with the step's native `segments[]` + the injected tradition KB, invokes Copilot once, and writes `data/translations/_vidhi/<vidhiId>.<lang>.json`. Output is re-aligned 1:1 against the native segments (segment ids/order are authoritative from `vidhi.json`, never the model). Honors the vidhi policy: idiomatic + short explanation, ritual-term glosses in the target script, **no** word-by-word/etymology/part-of-speech.
- **Scopeable** (`isVidhiScopeMatch`): `all`, a `pratikramanId` (e.g. `devasi`), or a single `vidhiId`. Skip-if-exists unless `--force`; `--max N` caps units per pass; failures isolate per unit. Web access is translation-only.

### 5.11 `src/intelligence/quality-grader.js`
- Runs `prompts/quality-grader.md` per (shloka × lang) against the corresponding translation JSON. Writes a timestamped report under `data/quality/`.

### 5.12 `src/render/*`
- `shloka-renderer.js` — renders one shloka block (native verse box + 3 language blocks). Each block shows `plainMeaning` ("In brief"), the target-script `recitation` line, the word-by-word table (with the `partOfSpeech` enum localized for display via `data/glossary/pos-labels.json`), literal + idiomatic translations, the verse-by-verse commentary, doctrinal context, practical relevance, cross-references, and sources.
- `sutra-renderer.js` — wraps a sutra's shlokas with a cover page; writes `data/html/per-sutra/<sutraId>.html`.
- `pdf-builder.js` — puppeteer (pool 4) HTML→PDF per sutra; `pdf-lib` merges per-sutra PDFs in canonical order into the final PDF.

### 5.13 `templates/print.css`
- A4, 22/18 mm margins; English 14pt, Gujarati/Hindi 16pt, native shloka 20pt bold; `page-break-inside: avoid` per shloka; explicit `BodyGujarati` (Noto Sans Gujarati / Shruti) and `BodyDevanagari` (Noto Sans Devanagari / Mangal) font stacks for correct conjunct shaping.

### 5.14 `website/scripts/sync-data.mjs` + `validate-data.mjs` (the website data bridge)
- **`sync-data.mjs`** reads the tool's `../data/` and (re)builds the website's public bundle under `website/public/data/`. It is **idempotent, partial-tolerant** (missing/unparseable files degrade gracefully, never throw), and **re-runnable mid-pipeline**. It merges, per sutra, the canonical verses × the up-to-three prefaces × all per-(shloka × lang) translations into one `sutra/<id>.json`; folds the native vidhi steps × their per-language translations into `vidhi.json`; unions the glossaries + pos-labels into `glossary.json`; copies the tradition KB (`achhalgach.md`) and any `data/pdfs/*`; and emits `index.json` (structure tree + a derived **availability map** + `stats`) and a compact `search-index.json`. Output schema in §9. Run as `npm run sync-data` (or `:watch`). **The bundle is git-ignored and regenerated**, so it is rebuilt before every `dev`/`start`, `build`, `deploy`, and in CI (§21).
- **`validate-data.mjs`** (`npm run validate`) asserts the synced bundle is internally consistent: structure referential integrity (every referenced `sutraId` exists; empty-sequence pratikramaṇas declare `basedOn` + `overrides`), every `sutra/<id>.json` parses with `native_script` on non-pending shlokas, a script spot-check (Gujarati/Hindi prose ≥ 85% target script, English recitation in Latin/IAST), and that no route target is missing. Exit 0 = pass.

### 5.15 `website/` (the published React app)
- **Stack:** React 18 + TypeScript + Vite + Tailwind, **client-side only** (no backend). Routing is **`HashRouter`** and Vite **`base`** is `'/Panch.Pratikraman/'` so deep links and assets resolve from the GitHub Pages project sub-path; every fetch goes through `import.meta.env.BASE_URL + 'data/...'`.
- **Pages** (`src/pages/`): Home, Pratikraman (walks a pratikramaṇa's `sequence`, **interleaving vidhi steps between sutras**), Sutra (verses with the native box, target-script recitation, word-by-word, translations, and elaboration; prefaces frame the sutra), Glossary, About (renders the tradition KB), plus a Style page and NotFound.
- **Components/state** (`src/components/`, `src/state/`): header with a persisted **EN / ગુ / हि** language toggle, breadcrumbs, search dialog (over `search-index.json`), bookmarks/library, theme, and the script-aware text renderers. Self-hosts Noto Sans/Serif Gujarati + Devanagari for correct conjunct shaping.
- **Source of truth:** the app **never** hard-codes scripture; it renders exactly what the synced JSON says and degrades gracefully where a field is absent.

---

## 6. Parallelization map

| Operation | Strategy | Concurrency |
|---|---|---|
| Per-page OCR transcription (Copilot vision) | `Promise.all` | copilot sem (6) |
| Per-(sutra × lang) preface (Copilot) | `Promise.all` | copilot sem (6) |
| Per-(shloka × lang) translation (Copilot) | `Promise.all` | copilot sem (6) |
| Glossary merge | sequential, code | n/a |
| Per-vidhi-step native extraction (Copilot) | `Promise.all` | copilot sem (6) |
| Per-(vidhi × lang) translation (Copilot) | `Promise.all` | copilot sem (6) |
| Per-(shloka × lang) quality grading | `Promise.all` | copilot sem (6) |
| Canonical build (verse extraction) | sequential, code | n/a |
| Per-sutra HTML render | `Promise.all` | n/a |
| Per-sutra puppeteer PDF | `Promise.all` | pdf pool (4) |
| Final PDF merge | sequential | n/a |

Throughput note: a single opus-4.8 translation call runs ~2–5 min; the orchestrator drains 6 at a time. A `translate` pass first drains the needed prefaces (1 call per sutra × lang), then the verses (1 call per shloka × lang), so a fresh sutra of N shlokas × 3 langs costs `3 prefaces + 3N verse-calls` in `⌈(3 + 3N)/6⌉` waves.

---

## 7. CLI Modes

All commands are invoked as `node index.js <command> [options]`. Global flags: `-c/--config <path>` (default `config.txt`), `-v/--verbose` (debug logging to console + log file).

### 7.0 Command reference (one-line summary)

| Command | Purpose |
|---|---|
| `ppt ocr [--pages <spec>] [--concurrency N] [--reasoning L] [--force] [--skip-rasterize]` | Rasterize the book + transcribe pages (one Copilot vision call/page) → `data/book/pages/*` |
| `ppt assemble` | Concatenate pages → `data/book/panch-pratikraman.full.md`; mark manifest verified |
| `ppt build-corpus` (alias `reconcile`) | Deterministically build `data/corpus/canonical.json` from the structure tree + golden pages; auto-validates |
| `ppt translate --scope <id\|all> [--lang …] [--force] [--max N]` | Per-(shloka × lang) translation+elaboration. Default scope = `nandisutrani-pratham-sajay`. Injects tradition KB |
| `ppt vidhi [--extract] [--translate] [--scope <id>] [--lang …] [--force] [--max N]` | Extract vidhi/ādeśa text verbatim → `data/corpus/vidhi.json` and translate it → `data/translations/_vidhi/`. Neither flag ⇒ both phases. Scope = `all`/`pratikramanId`/`vidhiId` |
| `ppt grade --scope <…> [--lang …] [--sample N]` | Quality grader → `data/quality/<ts>.report.json` |
| `ppt render --scope <…> [--lang …]` | Per-sutra HTML → per-sutra PDFs |
| `ppt build-pdf --scope <…>` | Merge per-sutra PDFs in canonical order into the final PDF |
| `ppt status` | Coverage stats: book pages OCR'd, pratikramans/sutras, shlokas, translations per language |
| `ppt logs [-n N]` | Print last N lines of the latest log |
| `ppt iterate --scope <…> [--max N] [--lang …]` | Convenience: force-translate → grade → print summary (prompt-tuning loop) |

### 7.1 `ocr` — transcribe the scanned book
- **What it does:** runs `scripts/rasterize.py` (PDF → page tiles) unless `--skip-rasterize`, then `scripts/ocr-orchestrator.mjs` — one `copilot` vision process per page (two tiles attached), writing `data/book/pages/page-NNN.{txt,meta.json}`. Parallel under the copilot semaphore; idempotent (`--pages missing` default skips done pages); flags `uncertain` glyphs per page.
- **When to run:** once, to produce the golden text. Re-run with `--pages <list>` + `--force` to redo specific pages.
- **Outputs:** `data/book/tiles/*`, `data/book/pages/*`, `data/book/ocr-manifest.json`.
- **Time:** ~150 s/page at `--reasoning high`; ~45 min for all 90 at concurrency 6.
- **Example:** `node index.js ocr --pages missing --concurrency 6 --reasoning high`

### 7.2 `assemble` — build the golden document
- **What it does:** runs `scripts/assemble-book.mjs` to concatenate the per-page text into `data/book/panch-pratikraman.full.md` (page-marked, footnotes preserved) and mark every page `verified` in the manifest.
- **When to run:** after `ocr`, or after hand-correcting any `page-NNN.txt`.
- **Outputs:** `data/book/panch-pratikraman.full.md`.
- **Example:** `node index.js assemble`

### 7.3 `build-corpus` (alias `reconcile`) — build the canonical corpus
- **What it does:** `buildCanonical()` reads `data/corpus/pratikraman-structure.json`, orders the sutras canonically, and extracts each sutra's verses from the golden pages (`src/corpus/book-parser.js`). Produces `data/corpus/canonical.json` with sequential `shlokaId`s (+ the book's `printedNumber`); prose/list sutras are flagged `needsVerseExtraction`. `validateCanonical()` runs immediately after.
- **When to run:** after `assemble`, or after editing the structure tree / a heading needle.
- **Outputs:** `data/corpus/canonical.json` (38 sutras, ~285 shlokas).
- **Example:** `node index.js build-corpus -v`

### 7.5 `translate` — the heart
- **What it does:** runs the four-phase pipeline in §5.10. For each in-scope sutra × language it first ensures a **preface** (`_preface.<lang>.json` — the write-once sutra-level framing + glossary), then for each `(shloka × lang)` fills `prompts/translate-elaborate.md` with the shloka, prev/next context, the injected tradition KB, **and the preface** (so the verse commentary never repeats sutra-level framing), invokes Copilot, and writes one JSON per `(shloka × lang)`. Finally it merges all prefaces' glossaries into `data/glossary/<lang>.json`. Skip-if-exists unless `--force`; failures isolate per unit; prompts may web-fetch dictionaries/commentaries.
- **Each verse JSON carries:** `plainMeaning` (a one-line beginner gloss), `recitation` (the whole verse in the **target script** — IAST for English, Gujarati/Devanagari for the others), `wordByWord[]` (per-token IAST `translit`, gloss, `partOfSpeech` enum, etymology), `literalTranslation`, `idiomaticTranslation`, `elaboration{ verseByVerseCommentary, doctrinalContext, practicalRelevance, crossReferences[] }`, `sources[]`, `translatorConfidence`, `notes`. Commentary length follows the verse (no padding).
- **Flags:**
  - `-s, --scope <id>` — `sutraId` (e.g. `nandisutrani-pratham-sajay`), `shlokaId` (e.g. `nandisutrani-pratham-sajay/03`), or `all`. Default `nandisutrani-pratham-sajay`.
  - `-l, --lang <list>` — comma-separated: `english,gujarati,hindi` or `all`. Default `all`.
  - `-f, --force` — regenerate even if the file exists (also regenerates the preface).
  - `--max <n>` — cap shlokas this pass (0 = unlimited).
- **Tip (cheap field-only re-runs):** to change only the verse JSON (e.g. after a prompt tweak) while keeping prefaces, delete just the `<shlokaId_safe>.<lang>.json` files and run **without** `--force`; the orchestrator reuses the on-disk prefaces and regenerates only the verses.
- **Time:** ~2–5 min per call; 6 in parallel; a fresh sutra of N shlokas × 3 langs ≈ `3 prefaces + 3N verse-calls`.
- **Examples:**
  ```powershell
  node index.js translate --scope nandisutrani-pratham-sajay --max 3 -v
  node index.js translate --scope nandisutrani-pratham-sajay -l gujarati,hindi --force
  node index.js translate --scope all
  ```

### 7.5b `vidhi` — extract + translate the procedural text
- **What it does:** the two-phase vidhi pipeline (§5.10b). **Phase A (`--extract`)** enumerates every `{type:"vidhi"}` step in the structure tree, feeds Copilot the **verbatim golden page text** for each step's `bookPages`, and writes the segmented, book-verbatim native text to `data/corpus/vidhi.json`. **Phase B (`--translate`)** renders each extracted step into `data/translations/_vidhi/<vidhiId>.<lang>.json` under the vidhi policy (idiomatic + short explanation, ritual-term glosses in the target script, no word-by-word). **Neither flag ⇒ run both** (extract, then translate). After the run it validates the native layer (and the translation layer if present) via `validateVidhi`/`validateVidhiTranslations`.
- **Flags:**
  - `--extract` / `--translate` — run only that phase (both if neither given).
  - `-s, --scope <id>` — `all` (default), a `pratikramanId` (e.g. `devasi`), or a single `vidhiId` (e.g. `devasi-iriya-adesh`).
  - `-l, --lang <list>` — `english,gujarati,hindi` or `all` (Phase B). Default `all`.
  - `-f, --force` — regenerate even if the artifact exists (idempotent/resumable otherwise: existing steps/files are skipped).
  - `--max <n>` — cap units per pass (0 = unlimited).
- **Outputs:** `data/corpus/vidhi.json` (Phase A), `data/translations/_vidhi/<vidhiId>.<lang>.json` (Phase B). See §9 for both schemas.
- **Guarantees:** `native_script` is copied **verbatim** from the golden pages (never normalized/translated in Phase A); a step Copilot cannot locate is flagged `needsExtraction` (never fabricated); `leadsToSutra` links an ādeśa/direction to the sūtra it names. Joined to the structure tree + the website by `vidhiId`.
- **Examples:**
  ```powershell
  node index.js vidhi --extract --scope devasi-iriya-adesh -v   # probe one step
  node index.js vidhi --translate --scope devasi-iriya-adesh -l english
  node index.js vidhi --scope devasi                            # both phases, one pratikraman
  node index.js vidhi --scope all                               # the whole book's vidhi
  ```

### 7.6 `grade` — quality assessment
- **What it does:** for each translation file in scope, invokes Copilot with `prompts/quality-grader.md` to score 6 dimensions (accuracy, depth, scriptCorrectness, doctrinalFidelity, readability, sourceCitationQuality), produces `overall` 0–10 and `verdict` (`publish` / `revise` / `reject`). Writes `data/quality/<timestamp>.report.json`. Prints mean overall + path.
- **Flags:** `-s/--scope`, `-l/--lang`, `--sample <n>` (cap items graded).
- **Example:** `node index.js grade --scope nandisutrani-pratham-sajay --sample 9`

### 7.7 `render` — per-sutra HTML + PDF
- **What it does:** for each in-scope sutra: assembles a per-sutra HTML (cover + every shloka block with native verse box + 3 lang sections + word-by-word table) and runs puppeteer (pool 4) to produce a per-sutra PDF.
- **Outputs:** `data/html/per-sutra/<sutraId>.html`, `data/pdfs/per-sutra/<sutraId>.pdf`.
- **Example:** `node index.js render --scope nandisutrani-pratham-sajay`

### 7.8 `build-pdf` — merge final PDF
- **What it does:** merges per-sutra PDFs in canonical order using `pdf-lib` into the final volume.
- **Outputs:** `data/pdfs/panch-pratikraman-<tradition>[-<scope>].pdf`.
- **Example:** `node index.js build-pdf --scope all`

### 7.9 `status` — coverage report
- **What it does:** prints book-OCR coverage (pages done / 90), the structure-tree counts (pratikramans / unique sutras), canonical sutra+shloka counts, and per-language translation coverage.
- **Example:** `node index.js status`

### 7.10 `logs` — tail latest log
- **Flags:** `-n, --lines <N>` (default 100).
- **Example:** `node index.js logs -n 200`

### 7.11 `iterate` — prompt-tuning loop
- **What it does:** convenience flow — force-translate the scope, then grade it, then print a per-item summary (overall + verdict + issues). Used during prompt/KB tuning.
- **Flags:** `-s/--scope`, `-l/--lang`, `--max <n>` (default 3).
- **Example:** `node index.js iterate --scope nandisutrani-pratham-sajay --max 3 -v`

### 7.12 Authoritative workflow (book-driven)

```powershell
# One-time golden-source build (skip if data/book/ is already populated):
node index.js ocr                 # rasterize + transcribe the scanned book
node index.js assemble            # -> data/book/panch-pratikraman.full.md
# Curate (hand): data/corpus/pratikraman-structure.json and
#                data/tradition-knowledge/achhalgach.md
node index.js build-corpus        # deterministic canonical.json from the book

# Per sutra:
node index.js translate --scope <sutra-id>
node index.js grade --scope <sutra-id>
node index.js render --scope <sutra-id>
node index.js build-pdf --scope <sutra-id>
```

### 7.13 Full corpus run

```powershell
node index.js translate --scope all
node index.js grade --scope all --sample 30
node index.js render --scope all
node index.js build-pdf
```

---

## 8. Prompt catalog

| File | Markers | Caller | Notes |
|---|---|---|---|
| `prompts/ocr-page.md` | `OCR_START/END` | `scripts/ocr-orchestrator.mjs` | One call per page; two image tiles attached via `--attachment`; verbatim Gujarati, flags `uncertain` |
| `prompts/sutra-preface.md` | `PREFACE_START/END` | `intelligence/translation-orchestrator.js` | One call per (sutra × lang); write-once sutra-level framing + glossary; consumes `{{TRADITION_KNOWLEDGE}}` |
| `prompts/translate-elaborate.md` | `TRANSLATION_START/END` | `intelligence/translation-orchestrator.js` | The heart; one call per (shloka × lang); consumes `{{TRADITION_KNOWLEDGE}}` + the preface; may web-fetch |
| `prompts/extract-vidhi.md` | `VIDHI_START/END` | `intelligence/vidhi-orchestrator.js` | One call per vidhi step; verbatim Gujarati transcription + segmentation of procedural/ādeśa text from the fed golden pages; never translates |
| `prompts/translate-vidhi.md` | `VIDHI_TR_START/END` | `intelligence/vidhi-orchestrator.js` | One call per (vidhi × lang); idiomatic + short explanation per the vidhi policy; consumes `{{TRADITION_KNOWLEDGE}}`; may web-fetch |
| `prompts/quality-grader.md` | `GRADE_START/END` | `intelligence/quality-grader.js` | Rubric over a generated translation |

OCR runs at `--reasoning high`; preface/translation/grading at `high`/`xhigh`, `long_context`, on `claude-opus-4.8`.

---

## 9. Output schemas (canonical references)

- **data/book/pages/page-NNN.txt** (golden OCR): `# page:` / `# book_page:` / `# header:` comment header, then verbatim body lines, then an optional `--- FOOTNOTES ---` block. Sidecar `page-NNN.meta.json`: `{ page, bookPage, header, sutraHeadings[], verseNumbers[], footnotes[{marker,text}], uncertain[{near,why}], separator }`.
- **data/book/ocr-manifest.json**: `{ pdf, longEdge, overlap, pageCount, generatedAt, rendered, verified, verifiedAt, pages:[{ page, tiles[], status, bookPage? }] }`. `status` ∈ `pending | transcribed | verified`.
- **data/corpus/pratikraman-structure.json** (INPUT, curated): `{ tradition, sutras{<id>:{name_native,name_translit,name_en,kind,bookPages,pdfPages[],gathaCount?,smaranNo?,role,usedIn[]}}, pratikramans[{id,name_*,frequency,covers,order,bookPages,sequence[{type:"vidhi"|"sutra",...}],basedOn?,overrides?}], appendix, avashyakas }`.
- **data/corpus/canonical.json** (generated by `build-corpus`): `{ tradition, source, generatedAt, sutras:[{ sutraId, name_native, name_translit, name_en, aliases, order, kind, script, bookPages, pdfPages[], usedIn[], role, needsVerseExtraction?, shlokas:[{ shlokaId, number, printedNumber, native_script, script, source_ids:["book"], reconcile_confidence }] }], globalNotes }`. `shlokaId` = `<sutraId>/NN` where NN is **sequential** within the sutra (unique even when the book restarts verse numbering per sub-section); the book's printed verse number is kept as `printedNumber`. Prose/formula sutras with no numbered verses carry `needsVerseExtraction: true` and an empty `shlokas`.
- **data/translations/<sutraId>/_preface.<lang>.json** (write-once, per sutra × lang): `{ sutraId, targetLang, targetScript, title, summary, ritualPlacement, authorAndSource, structureArc, recurringImagery, keyThemes[], glossary[{term,scriptForm,definition}], howToRead, sources[], notes }`.
- **data/translations/<sutraId>/<shlokaId_safe>.<lang>.json** (per shloka × lang): `{ shlokaId, targetLang, targetScript, plainMeaning, recitation, wordByWord[{token,translit,gloss,partOfSpeech,etymology,notes}], literalTranslation, idiomaticTranslation, elaboration{verseByVerseCommentary, doctrinalContext, practicalRelevance, crossReferences[{text,source}]}, sources[{title,url,type,consultedFor}], translatorConfidence, notes }`. All target-language fields are in the target script; `recitation` is target-script (IAST for English); per-token `translit` is always IAST; `partOfSpeech` is a stable English enum (localized only at render time).
- **data/glossary/<lang>.json** (generated): `{ lang, generatedAt, terms[{ term, scriptForm, definition, sutras[] }] }` — deduped union of every preface's glossary for that language.
- **data/corpus/vidhi.json** (generated by `vidhi --extract`): `{ tradition, source, generatedAt, steps:[{ vidhiId, pratikraman, summary_en, bookPages, pdfPages[], needsExtraction, notes?, segments:[{ segmentId:"<vidhiId>/NN", kind:"adesh"|"direction"|"formula", speaker:"shishya"|"guru"|null, native_script, script:"gujarati", source_ids:["book"], leadsToSutra }] }] }`. Keyed by the structure tree's vidhi-step `id`; `native_script` is copied **verbatim** from the golden pages; `segmentId` NN is sequential within the step; `speaker` is `null` for `direction`s; `leadsToSutra` resolves to a `sutras{}` id when an ādeśa/direction names the sūtra it introduces, else `null`. A step Copilot could not locate is emitted with `needsExtraction:true` + empty `segments` (never fabricated).
- **data/translations/_vidhi/<vidhiId>.<lang>.json** (per vidhi × lang): `{ vidhiId, targetLang, targetScript, title, summary, segments:[{ segmentId, recitation, plainMeaning, idiomaticTranslation, explanation, ritualTerms[{term,gloss}] }], sources[{title,url,type,consultedFor}], translatorConfidence, notes }`. One file holds **all** segments of the step (they share ritual context); `segments[]` align 1:1 (same ids, same order) with `vidhi.json`. Per the vidhi policy (achhalgach.md §5) there is **no** `wordByWord`/`etymology`/`partOfSpeech`; `recitation` is the **target script** (IAST for English, Devanagari for Hindi, Gujarati for Gujarati) and is only required for the spoken `adesh`/`formula` segments; ritual terms (`ādeśa, kāyotsarga…`) are transliterated **into the target script** with a parenthetical gloss. `vidhiId` is already filesystem-safe (kebab-case, no `/`).
- **data/glossary/pos-labels.json** (INPUT, curated, committed): `{ labels:{ <enumKey>:{ english, gujarati, hindi } } }` — display labels for the `partOfSpeech` enum, used by the renderer (and intended for the future website).
- **data/quality/<ts>.report.json**: `{ generatedAt, results: [{ shlokaId, lang, grade: { scores, overall, verdict, issues, praises } }] }`

- **website/public/data/** (generated by `npm run sync-data`; gitignored; this is what the app fetches via `BASE_URL + 'data/...'`):
  - `index.json` — `{ generatedAt, tradition, traditionAliases[], source, sourceBook, note, pratikramans[], sutras{}, avashyakas[], appendix, availability{<sutraId>:{hasCanonical,needsVerseExtraction,shlokaCount,prefaces{},translatedShlokas{},anyTranslated}}, pdfs[], intro, stats{sutraCount,prefaceCount,shlokaCount,translationCount,vidhiStepCount,vidhiTranslationCount} }` — the structure tree the app routes from + a derived per-sutra/per-language coverage map.
  - `sutra/<sutraId>.json` — one lazy-loaded bundle per sutra: meta + `prefaces{lang}` + `shlokas[]`, each shloka merging the canonical verse with its `translations{lang}`.
  - `vidhi.json` — `{ generatedAt, steps{<vidhiId>:{ …, segments[], translations{lang}, translatedLangs{} }} }`.
  - `glossary.json` — `{ generatedAt, languages{lang:{terms[]}}, posLabels{} }`.
  - `search-index.json` — `{ generatedAt, records[] }` over shlokas, sutras, vidhi segments, and glossary terms.
  - `achhalgach.md` — the tradition KB copied for the About page; `pdfs/*` — any complementary PDFs found under `data/pdfs`.

`shlokaId_safe` replaces `/` with `__` for filesystem safety (`utils/slug.js`).

---

## 10. Quality iteration workflow

1. Translate a small sample (`ppt translate --scope <sutra> --max 3`).
2. Grade (`ppt grade --scope <sutra>`).
3. Inspect per-component scores. Common failure modes and fixes:
   - Low `scriptCorrectness` → strengthen the "target-script only" rule in `prompts/translate-elaborate.md`.
   - Low `sourceCitationQuality` → name specific dictionary URLs; reinforce "do NOT hallucinate citations".
   - Low `depth` → add concrete exemplars + anti-patterns to the prompt.
   - Low `doctrinalFidelity` → enrich `data/tradition-knowledge/<tradition>.md` (NOT the per-call prompt).
4. Re-run via `ppt iterate --scope <sutra> --max 3` (force-translate → grade → summary).
5. Iterate until **overall ≥ 9.0 with no component < 8** across the sample.
6. Lock prompts + tradition KB (commit), then translate the full sutra.
7. `ppt render` + `ppt build-pdf`; print-preview; verify Gujarati conjuncts (`જ્ઞ`, `ક્ષ`, `શ્ર`), Devanagari conjuncts, body ≥ 14pt, page-breaks at shloka boundaries.
8. Only then: `ppt translate --scope all`.

---

## 11. Configuration (`config.txt`)

| Key | Default | Notes |
|---|---|---|
| `copilotModel` | `claude-opus-4.8` | Model for all Copilot calls |
| `copilotModelLarge` | `claude-opus-4.8` | Used for OCR / preface / translation / grading |
| `copilotReasoning` | `xhigh` | → `--reasoning-effort` (choices: none/low/medium/high/xhigh/max); OCR overrides to `high` via `ppt ocr --reasoning` |
| `copilotContextTier` | `long_context` | → `--context` (the 1M-token window; alt: `default`) |
| `copilotConcurrency` | `6` | Max concurrent Copilot processes (shared by OCR / preface / translate / grade) |
| `dataDir` | `./data` | Relative to the config file |
| `tradition` | `achhalgach` | Selects `data/tradition-knowledge/<tradition>.md` and tags outputs |

(The former `scrapeConcurrency`, `scrapeTimeoutMs`, and `userAgent` keys were removed with the web-scraping modules.)

---

## 12. Troubleshooting

- **`unknown option '--reasoning'` / `--web-search`**: this CLI uses `--reasoning-effort <level>` and has no `--web-search` (web access is via `--allow-all`). All flag names live only in `buildCmd` in `src/copilot.js` — edit there.
- **OCR returns empty / `copilot` hangs**: stdin must be closed when spawning `copilot`. Always drive it through `src/copilot.js` (which does `child.stdin.end()`), never a raw shell call.
- **`--attachment` not recognized**: the installed Copilot CLI must support image attachments for `ppt ocr`. Verify with `copilot --help`.
- **Copilot CLI binary not found**: ensure the `copilot` CLI is installed and `where copilot` resolves on Windows (the wrapper prefers the npm `.cmd`).
- **A page has `uncertain` glyphs**: open `data/book/pages/page-NNN.meta.json`, inspect each `uncertain` entry against the scan tile, fix `page-NNN.txt` by hand, then re-run `ppt assemble` (and `ppt build-corpus` if a verse changed).
- **A sutra shows `needsVerseExtraction`** (prose/list/formula sutra, or a heading needle didn't match): add or fix the heading needle in `src/corpus/canonical-builder.js` (`HEADING_NEEDLES`) and re-run `ppt build-corpus`.
- **Shloka text is wrong**: correct the golden OCR at `data/book/pages/page-NNN.txt`, re-`assemble`, re-`build-corpus`. The book is the only source of truth.
- **Commentary mis-states ritual placement / repeats sutra-level framing**: enrich `data/tradition-knowledge/<tradition>.md` (doctrine) or the sutra preface (`_preface.<lang>.json`); the per-verse prompt is told not to restate preface content.
- **Gujarati / Devanagari renders as boxes**: install Noto Sans Gujarati / Noto Sans Devanagari on the rendering machine (puppeteer uses the system font stack).

---

## 13. Tradition knowledge base (`data/tradition-knowledge/<tradition>.md`)

**Purpose:** give every per-shloka Copilot session the same authoritative system context so commentaries are consistent and correctly placed.

**Contents (current draft for `achhalgach`):** tradition aliases; the five Pratikramanas (Devasi, Rāi, Pakkhi, Cāumāsi, Sāṁvatsari) and what each covers; the six Āvaśyakas in order with their anchor sutras; the **correct placement of the Pratham Sajjhāy** (a closing svādhyāya / study recitation — explicitly **NOT** the opening of the ritual, and **not** one of the six Āvaśyakas); recurring doctrinal themes (four-fold Saṅgha metaphors, atichāras, 18 pāpa-sthāna, etc.); a per-sutra summary table (with `STUB` markers for unverified entries); and style guidance forbidding invented ritual placement.

**Injection:** `translation-orchestrator.js` reads this file and substitutes it into `{{TRADITION_KNOWLEDGE}}` in `prompts/translate-elaborate.md` for every call. Missing file → a guard string tells the model not to invent placement.

**Lifecycle:** author/refine once against the golden book, then lock (commit) and rely on it for all subsequent translations. Re-running `translate --force` after editing the KB re-grounds existing translations.

**Current version (v1.0):** authored end-to-end from the OCR'd book. Covers tradition aliases + lineage (Āryarakṣitasūri, 47th paṭṭa; Kalyāṇasāgarasūri); the five pratikramaṇas + **the book's own sharing model** (Cāumāsī/Sāṁvatsarī = Pakkhī + word-substitution + kāyotsarga override, per Āvaśyaka Niryukti g.1532); the six Āvaśyakas + anchor sutras; the full recitation tree + nine-smaraṇa table; a 30-row sutra inventory whose ids match the structure tree; the placement of the **Nandī-sūtra Pratham Sajjhāy as a Pakkhī svādhyāya (not the ritual opening)**; the vidhi translation policy; orthography/fidelity rules (`અતિયાર` with ય; preserve book inconsistencies verbatim); and style guidance.

---

## 14. Data integrity & provenance (why scripture is never fabricated)

A scanned printed book is the **single golden source**; the tool does no web sourcing of scripture. Guarantees:

1. **The book is ground truth.** Every sutra and vidhi line comes from `data/book/panch-pratikraman.full.md`, OCR'd verbatim from the printed book and hand-verified (90/90 pages). The OCR preserves the book's exact orthography.
2. **No fabrication, no web sourcing.** There is no source discovery, scraping, or multi-source reconciliation. `build-corpus` only extracts verses that actually exist in the golden pages; sutras with no numbered verses are flagged `needsVerseExtraction` (never filled with filler).
3. **Deterministic provenance.** Each canonical shloka carries `source_ids: ["book"]`, the book's `printedNumber`, and `bookPages`/`pdfPages` anchors into the golden text; `ppt status` and `canonical.json` show exactly where each verse came from.
4. **Web access is translation-only.** The `--allow-all` web-fetch tool is available **only** to the translation/grading prompts (to consult dictionaries and commentaries), never to source scripture.

**The book:** *Pañca Pratikramaṇa Sūtra — Vidhi Sahit* (Anchalgachchha / Vidhipaksha ed.), scanned as `input/panch_pratikraman.pdf` (book pp.19–108). `nandisutrani-pratham-sajay` is the full **24 gāthās** extracted from the book (book pp.80–82).

---

## 15. Current project state (v1.0 — shipped)

- **Golden source:** the scanned book, OCR'd to 90/90 verified pages (`data/book/`), assembled into `panch-pratikraman.full.md`.
- **Structure:** `data/corpus/pratikraman-structure.json` — 5 pratikramaṇas, 38 unique sutras, the recitation tree + vidhi steps, the nine smaraṇas, and the Cāumāsī/Sāṁvatsarī sharing model.
- **Knowledge base:** `data/tradition-knowledge/achhalgach.md`, authored from the book.
- **Corpus:** `build-corpus` produces `canonical.json` deterministically — 38 sutras, 285 shlokas (21 sutras with extracted verses; 17 prose/list/formula sutras still flagged `needsVerseExtraction`).
- **Translations — every extracted verse done.** All **285 extracted shlokas** (across the 21 verse-bearing sutras) are translated in all three languages, each sutra fronted by its write-once **preface** (21 × 3); the prefaces' glossaries merge into `data/glossary/<lang>.json`. (`ppt status` shows 306/305/306 = 285 shlokas + 21 prefaces per language; the last Gujarati verse of `bruhad-atiyar` is finishing.) `partOfSpeech` is localized at render time via `data/glossary/pos-labels.json`.
- **Vidhi — complete.** All **10 vidhi steps** (72 segments) are extracted verbatim into `data/corpus/vidhi.json` and translated into `data/translations/_vidhi/<vidhiId>.<lang>.json` in all three languages, under the vidhi policy (idiomatic + short explanation; ritual-term glosses in the target script; no word-by-word). `leadsToSutra` links an ādeśa to the sūtra it introduces.
- **Website — live (the primary experience).** A client-side React + TypeScript + Vite app under `website/` renders the whole corpus in three languages — sutra pages, the five pratikramaṇa sequences with **vidhi interleaved**, glossary, client-side search, and an About page from the tradition KB. It is rebuilt from `data/` by `npm run sync-data` and deployed to **GitHub Pages** by `.github/workflows/deploy-pages.yml` on every push to `main` (§21).
- **PDF — complementary.** `ppt render` + `ppt build-pdf` still produce the downloadable A4 volume from the same artifacts.
- **Committed corpus.** `canonical.json`, `vidhi.json`, the three glossaries, and all of `translations/**` are committed, so the website + CI build with **zero pipeline runs** (§4, §21).
- **Not yet extracted:** 17 sutras remain flagged `needsVerseExtraction` (numbered verses not matched from the golden pages; some are genuinely prose/list/formula) — the main remaining content work (open item 1).
- **Models:** `claude-opus-4.8`; OCR at `--reasoning high`; preface/translation at `high`/`xhigh`, `long_context`.
- **Open items:**
  1. **Open** — give the 17 `needsVerseExtraction` sutras their verses (e.g. `tassa-uttari`, `karemi-bhante`, `smaran-1-bruhannamaskar`, `smaran-3-virstava`, `smaran-7-shakrastava`, `mannaha-jinanam-sajjhay`, …): add heading needles in `canonical-builder.js` (or a single-formula fallback), re-run `build-corpus`, then `translate`/`grade` them.
  2. ~~Translate the verse-bearing sutras~~ **DONE** — all 21 sutras with extracted verses translated in all three languages.
  3. ~~Add a vidhi extraction + translation pipeline~~ **DONE** — `ppt vidhi` (§5.10b); all 10 steps extracted + translated; `validateVidhi`/`validateVidhiTranslations` check it.
  4. ~~Interleave vidhi between sutras~~ **DONE in the website** — the pratikramaṇa pages walk the structure tree's `sequence`, rendering vidhi inline between sutras (the PDF renderer still emits per-sutra; interleaving it is optional polish).
  5. ~~Build the client-side website~~ **DONE + deployed** — see §21.
  - Optional polish: audio/chanting alignment (§16); periodic re-grade passes; richer glossary cross-links.

---

## 16. Extending

- **Another tradition** (e.g., Tapagachchha): set `tradition` in config, author `data/tradition-knowledge/<tradition>.md`, and build that tradition's `data/corpus/pratikraman-structure.json` from its book. All code is tradition-agnostic.
- **Add a language** (e.g., Marathi): add it to `LANGS` in `translation-orchestrator.js` + `quality-grader.js`, add a column to `data/glossary/pos-labels.json`, add a font stack in `templates/print.css`, and add a CSS class in `shloka-renderer.js`.
- **Client-side website** (built + deployed — see §21): the per-(shloka × lang) JSON, the per-sutra prefaces, the structure tree, the vidhi layer, and the glossary are all static files, so the site under `website/` is a pure renderer over them and needs no pipeline change. Re-run `npm run sync-data` after the tool emits new JSON; CI redeploys on push to `main`. The PDF (`render` + `build-pdf`) is the complementary downloadable.
- **EPUB**: another renderer over the same artifacts.
- **Audio / chanting alignment**: out of scope for MVP; add `src/audio/` + a new prompt. (The `recitation` field already gives a clean per-verse chant line.)

---

## 17. Recipes (concrete authoring tasks)

### 17.1 Fix or add a sutra's verses (golden-text → corpus)

The corpus is built deterministically from the OCR'd book, so verse text is edited at the **golden source**, not in a per-sutra file.

- **Correct a verse:** edit `data/book/pages/page-NNN.txt` (the verbatim OCR), then:
  ```powershell
  node index.js assemble        # rebuild the golden full.md + manifest
  node index.js build-corpus    # re-extract verses into canonical.json
  node index.js translate --scope <sutraId> --force
  ```
- **A sutra is flagged `needsVerseExtraction`** (its verses weren't detected): the structure tree's `pdfPages` for that sutra are correct, but `src/corpus/canonical-builder.js` lacks a matching `HEADING_NEEDLES` entry (a distinctive Gujarati substring of the sutra's printed heading). Add one and re-run `build-corpus`.
- **Add a sutra to the recitation:** add its entry to `data/corpus/pratikraman-structure.json` (`sutras{<id>}` with `pdfPages`, `role`, `usedIn`) and a `{type:"sutra",sutraId}` step in the relevant pratikramaṇa `sequence`, plus a `HEADING_NEEDLES` entry if needed; then `build-corpus`.

`sutraId` MUST be kebab-case and stable — it is the directory name under `data/translations/` and is referenced by the structure tree and the canonical corpus.

### 17.2 Evolve the tradition knowledge base

File: `data/tradition-knowledge/<tradition>.md` (e.g. `achhalgach.md`).

When to edit:
- A grader run shows low `doctrinalFidelity` or commentaries mis-state the ritual placement of a sutra.
- You verify new facts from the book (sutra order, alternate names, structural roles).
- A new sutra type appears (e.g. a stuti, sajjhāy variant) that needs a doctrinal anchor.

What to add:
- A row in the sutra inventory table (§4 inside the KB) with `sutraId | name | role / core meaning`.
- A paragraph in the relevant doctrinal-themes section (§6 of the KB) if a recurring motif appears.
- A correction in the "style guidance" section (§8 of the KB) if a recurring elaboration error needs to be banned.

After editing: re-run `translate --force` for any affected sutra to re-ground its preface and verses with the new KB.

### 17.3 Diagnose a wrong / weak translation

1. `node index.js logs -n 200` — check for retry warnings, model errors.
2. Open the offending `data/translations/<sutraId>/<file>.json` — check `translatorConfidence`, `sources[]`, `notes`.
3. Run `node index.js grade --scope <shlokaId>` for a structured diagnosis.
4. If `accuracy` or `doctrinalFidelity` is low: enrich the tradition KB (§17.2) — DO NOT add per-call hints to the prompt template, the KB is the right place.
5. If `scriptCorrectness` is low: strengthen the "target-script only" rule in `prompts/translate-elaborate.md`.
6. Re-translate with `--force`: `node index.js translate --scope <shlokaId> --force`.
7. Optional: `node index.js iterate --scope <shlokaId> --max 1` runs the full translate→grade→summary loop.

### 17.4 Add a new Copilot-driven module

Pattern (mirror an existing intelligence module):

1. Create the prompt: `prompts/<task>.md`. Include `<<<TASK_START>>>` / `<<<TASK_END>>>` markers around the JSON output schema. Embed required inputs as `{{PLACEHOLDER}}` tokens.
2. Create the module: `src/intelligence/<task>.js`. Use `invokeCopilotJson(prompt, { markers: { start, end }, model: config.copilotModelLarge })`.
3. Use `fill(template, vars)` from existing modules (regex `{{(\w+)}}`).
4. Wire a CLI subcommand in `index.js` and add a row to §7 of this doc.
5. Persist outputs under `data/<task>/` so they are file-based and inspectable.

### 17.5 Add a new pure-code module

1. Place it under `src/<area>/<module>.js` (ESM, named exports).
2. Use `logger` from `src/utils/logger.js` for any non-trivial output.
3. Use `Semaphore` for any parallelizable work; don't create new pools — reuse the global copilot semaphore when applicable.
4. Wire into `index.js` only when it has a CLI entry point; otherwise call it from an existing orchestrator.

---

## 18. Glossary

- **Pancha Pratikramana** — the five Pratikramana (atonement) rituals: Devasi (daily, sunset), Rāi (daily, before sunrise), Pakkhi (fortnightly), Cāumāsi (quarterly), Sāṁvatsari (annual, Paryushan).
- **Sutra** — a canonical formula/verse-set recited as part of a ritual. In our corpus each sutra has a stable `sutraId` and is composed of one or more shlokas.
- **Shloka / Gāthā** — a single numbered verse within a sutra. Identified as `<sutraId>/NN` (zero-padded).
- **Āvaśyaka** — the six daily obligations forming the structural backbone of every Pratikramana: Sāmāiya, Cauvīsattha, Vandanaa, Paḍikkamaṇa, Kāussagga, Paccakkhāṇa.
- **Sajjhāy / Svādhyāya** — sacred-study recitation; performed during the closing portion of the ritual (NOT one of the six Āvaśyakas).
- **Achhalgach** — the Achalgachchha (also spelled Anchalgachchha / Aanchalagaccha) gaccha within Shvetambara Murtipujak Jainism; the target tradition for this tool.
- **Ardhamagadhi / Prakrit / Apabhramsa** — the Indic source languages of the original verses.
- **Word-by-word** — token-level gloss in the output JSON: `{ token, translit, gloss, partOfSpeech, etymology, notes? }`. `translit` is IAST; `partOfSpeech` is a stable English enum localized at render time via `data/glossary/pos-labels.json`.
- **Preface** — the write-once, per-(sutra × lang) artifact `data/translations/<sutraId>/_preface.<lang>.json`; holds shared framing (placement, author, verse arc, recurring imagery) + a per-sutra glossary, so per-verse files never repeat it.
- **plainMeaning** — a one-line, jargon-free gloss of a verse for newcomers (per-shloka field).
- **recitation** — the whole verse written for chanting in the **target script** (IAST for English, Gujarati/Devanagari otherwise).
- **Glossary** — `data/glossary/<lang>.json`, the deduped union of all prefaces' glossaries; plus the curated `data/glossary/pos-labels.json` (localized part-of-speech labels).
- **Vidhi** — the book's procedural connective text (begin/end declarations, "now recite X"); represented as `vidhi` steps in the structure tree (§20).
- **Tradition knowledge base (KB)** — the curated `data/tradition-knowledge/<tradition>.md` injected into every preface and translation prompt; provides shared system context (ritual order, doctrinal themes, sutra roles).
- **needsVerseExtraction** — flag on a canonical sutra whose numbered verses were not detected from the golden pages (prose/formula sutra, or a missing heading needle); it carries an empty `shlokas`.
- **Reconcile confidence** — `reconcile_confidence` on each canonical shloka; `1.0` since the single golden book is the source.
- **Marker** — text delimiter (`<<<NAME_START>>>` ... `<<<NAME_END>>>`) around structured JSON in Copilot output; the wrapper picks the largest span if duplicated.
- **Copilot sem** — the global semaphore capping concurrent Copilot processes (default 6), shared by OCR, prefaces, translation, and grading.

---

## 19. For agents modifying this tool

**Read first:** §1 (Goals), §1A (Prerequisites), §3 (Code-vs-AI), §5 (modules), §13 (Tradition KB), §14 (Data Integrity).

**Inviolable invariants — do not break:**
1. **The book is the single golden source.** Never fabricate shloka or vidhi text, and never re-introduce web discovery/scraping as a source of scripture. `build-corpus` only emits verses that exist in `data/book/`; missing verses are flagged `needsVerseExtraction`, never filled.
2. **All flag names live ONLY in `buildCmd` in [src/copilot.js](../src/copilot.js).** When Copilot CLI flag names change, fix them there once. Don't sprinkle CLI flag strings elsewhere. (This includes `--attachment`.)
3. **stdin must be closed** when spawning `copilot` (`child.stdin.end()`) — otherwise the CLI hangs / returns empty. Always drive `copilot` through `src/copilot.js`, never a raw shell call.
4. **Tradition KB is the only source of cross-cutting system context** in translation prompts. Don't put doctrinal hints in per-call code; put them in `data/tradition-knowledge/<tradition>.md`.
5. **OCR fidelity is verbatim.** `src/corpus/book-parser.js` and the OCR prompt must never normalize Gujarati spelling; the book's inconsistencies are truth.
6. **Idempotency:** `ocr` (per page) and `build-corpus` are safe to re-run; preserve this.
7. **Web access is translation-only.** Keep `--allow-all` web-fetch out of the sourcing path; it belongs to `translate`/`grade` prompts only.
8. **The committed corpus is the website + CI contract.** `data/corpus/canonical.json`, `data/corpus/vidhi.json`, the three `data/glossary/<lang>.json`, and all of `data/translations/**` are committed so the website and the Pages CI build with **zero pipeline runs**. Don't re-gitignore them; after regenerating the corpus, commit the changed JSON. The website (`website/`) must never hard-code scripture — it renders only what the synced bundle says (§5.15).

**Where to make common changes:**
| Change | File(s) |
|---|---|
| Copilot CLI flag changes (incl. `--attachment`) | `src/copilot.js` → `buildCmd` only |
| New CLI subcommand | `index.js` + new module under `src/` + new prompt under `prompts/` |
| New language | `src/intelligence/translation-orchestrator.js` (LANGS), `quality-grader.js` (LANGS), a column in `data/glossary/pos-labels.json`, `templates/print.css` (font stack), `src/render/shloka-renderer.js` (CSS class) |
| Change PDF look | `templates/print.css` |
| Change concurrency | `config.txt` (`copilotConcurrency`) |
| New tradition | Add `data/tradition-knowledge/<tradition>.md` + its `pratikraman-structure.json`, set `tradition=` in config |
| Translation pipeline / fields | `src/intelligence/translation-orchestrator.js` + `prompts/sutra-preface.md` (sutra-level) and `prompts/translate-elaborate.md` (per-verse) |
| Fix a sutra's verses | Correct `data/book/pages/page-NNN.txt`, re-`assemble`, re-`build-corpus` (or adjust a needle in `canonical-builder.js`) |
| Tighten/loosen quality rubric | `prompts/quality-grader.md` |
| Translation style/format | `prompts/translate-elaborate.md` (per-call) or `data/tradition-knowledge/<tradition>.md` (shared) |
| OCR quality / format | `prompts/ocr-page.md` + `scripts/ocr-conventions.md` |
| Website data bundle (shape the app consumes) | `website/scripts/sync-data.mjs` (+ `validate-data.mjs`) |
| Website UI / pages / styling | `website/src/**` (React + TS + Tailwind; see §5.15) |
| Website deploy / CI | `.github/workflows/deploy-pages.yml`; `website/package.json` scripts; `website/vite.config.ts` (`base`) |

**Verify before committing any change:**
```powershell
# Static syntax check (all source files)
Get-ChildItem index.js, src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
Get-ChildItem scripts -Filter *.mjs | ForEach-Object { node --check $_.FullName }

# Smoke run
node index.js --help
node index.js build-corpus
node index.js status

# Website (if you touched website/ or the data shape)
cd website; npm run sync-data; npm run validate; npm run build
```

**Conventions:**
- ESM only (`import` / `export`). `package.json` has `"type": "module"`.
- No TypeScript, no transpile step **for the tool** (the `website/` app is a separate TypeScript + Vite project).
- Use the `logger` from `src/utils/logger.js`; do not `console.log` from modules.
- Errors should be caught at module boundaries and converted to logger.error + a structured `{ error: "..." }` return value — never crash the whole orchestrator on a single unit's failure.
- Filenames: kebab-case for modules; `sutraId` and `shlokaId` are kebab-case; `shlokaId` is `<sutraId>/NN` and is filesystem-safed via `utils/slug.js` (`/` → `__`).
- Prompts use `{{PLACEHOLDER}}` syntax and `<<<NAME_START>>>` / `<<<NAME_END>>>` markers around the JSON schema and the output.

---

## 20. The OCR pipeline & the structure tree (v0.2)

**Why:** web discovery/scraping failed to find authoritative Achhalgach text. The user supplied a camera-scanned 90-page book. OCR of dense Gujarati conjuncts demanded a multimodal model, not `pdf-parse`/Tesseract.

**Pipeline (one-time, reproducible via `ppt ocr` / `ppt assemble`):**
1. **Rasterize** (`scripts/rasterize.py`, PyMuPDF): each page → two overlapping JPEG tiles (long edge 1568 px, ~6% overlap) under `data/book/tiles/`. Tiles are sized so the model sees crisp conjuncts; a full-page image would be downsampled and blur them.
2. **Transcribe** (`scripts/ocr-orchestrator.mjs`): one `copilot` process **per page**, both tiles attached via `--attachment`, prompt `prompts/ocr-page.md`, output `<<<OCR_START/END>>>` JSON → `data/book/pages/page-NNN.{txt,meta.json}`. Parallel under the copilot semaphore. **This per-page, fresh-context design is what made OCR tractable** — accumulating many page images in a single long-lived session (a subagent, or the main agent) overflows the multimodal context budget and stalls.
3. **Verify**: each page's `uncertain[]` glyphs are reviewed against the scan; the book's footnotes (mostly *pāṭhāntare* variants) are captured verbatim, not auto-applied.
4. **Assemble** (`scripts/assemble-book.mjs`): page-marked golden document `panch-pratikraman.full.md` + manifest marked `verified`.

**PDF→book page mapping:** PDF page *N* = printed book page *N + 18* (the scan begins at book p.19).

**The structure tree (`data/corpus/pratikraman-structure.json`)** is hand-curated from the golden text and is the website backbone: pick a pratikramaṇa → see its ordered `sequence` of vidhi + sutra steps → click a sutra to drill into its shlokas. It encodes the book's own sharing model (Cāumāsī/Sāṁvatsarī = Pakkhī + substitution) and is the registry `build-corpus` consumes. The **website** (§21) renders directly from this tree + `canonical.json` + `vidhi.json` + the per-(shloka × lang) translation JSON; no pipeline change is needed to publish new content — just re-run `npm run sync-data`.

---

## 21. The website & GitHub Pages deployment (v1.0)

The primary delivery of the corpus is a **client-side React + TypeScript + Vite** website under `website/`. It is a pure renderer over the generated static JSON — no backend, no database, no runtime API beyond fetching its own bundle — so it can be hosted on any static host; we publish it to **GitHub Pages**.

### 21.1 How the data reaches the site
`website/scripts/sync-data.mjs` (§5.14) reads the tool's `../data/` tree and writes the app's bundle to `website/public/data/` (`index.json`, `sutra/<id>.json`, `vidhi.json`, `glossary.json`, `search-index.json`, `achhalgach.md`, `pdfs/*` — schema in §9). The bundle is **git-ignored and always regenerated**, so the live site can never drift from the committed corpus.

**Latest translations are picked up automatically at every entry point** (the sync is wired into the npm lifecycle, never a manual step you can forget):

| Command | What runs | When |
|---|---|---|
| `npm run dev` / `npm start` | **`predev` → `sync-data`** → `vite` | local development |
| `npm run build` | `tsc -b && vite build` | (CI runs `sync-data` explicitly first) |
| `npm run deploy` | **`predeploy` → `sync-data` + `build`** → `gh-pages` | manual one-shot publish |
| CI (`deploy-pages.yml`) | `sync-data` → `validate` → `build` → deploy | every push to `main` |

Because the committed `data/` already holds the full corpus, **a fresh clone needs no pipeline run** — `cd website && npm install && npm run dev` builds the site from the committed JSON.

### 21.2 GitHub Pages setup
- **Vite base + routing.** `vite.config.ts` sets `base: '/Panch.Pratikraman/'` (it must equal the repository name) and the app uses **`HashRouter`**, so deep links resolve on Pages with zero server config and every asset/data fetch goes through `import.meta.env.BASE_URL`.
- **CI workflow.** `.github/workflows/deploy-pages.yml` runs on push to `main` (paths `website/**`, `data/**`, or the workflow file) and on manual dispatch: it `npm ci`s, runs `sync-data`, `validate`, `build`, uploads `website/dist` as the Pages artifact, and deploys it. Permissions `pages: write` + `id-token: write`; concurrency group `pages`.
- **One-time enablement.** In the GitHub repo: **Settings → Pages → Build and deployment → Source → GitHub Actions**. After the first green run the site is live at **`https://mahavir00.github.io/Panch.Pratikraman/`**.
- **Manual fallback.** `cd website && npm run deploy` publishes `dist` to the `gh-pages` branch via the `gh-pages` package (then set **Settings → Pages → Source → Deploy from a branch → `gh-pages`/root**). Use either the Actions path or this one, not both.

### 21.3 Contributor workflow
1. Edit/add translations with the tool (`ppt translate …` / `ppt vidhi …`) or hand-correct JSON under `data/translations/`.
2. `cd website && npm run sync-data` (or just `npm run dev`, which syncs first) to preview locally.
3. Commit the changed `data/**` JSON and push to `main` — CI re-syncs, validates, builds, and redeploys automatically.

The scripture is the single source of truth: the site renders exactly what the committed JSON says and degrades gracefully where a field is missing (§5.15).

