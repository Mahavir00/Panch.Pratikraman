# Build the Panch Pratikraman Website — Final Copilot Session Prompt

> **How to use:** open a NEW GitHub Copilot (agent) session in the `C:\Repos\Panch.Pratikraman` workspace and paste this entire file as your first message. It is self-contained. For deeper background read `docs/DESIGN.md` (the tool that produced the data) — but everything you need is below. Build to completion, then validate.

---

## 0. One-paragraph brief

This repository contains a definitive, three-language (**English, Gujarati, Hindi**) translation and acharya-grade commentary of the **Pancha Pratikramana sutras** of the **Achhalgach (Anchalgachchha / Vidhipaksha) Śvetāmbara Mūrtipūjaka Jain tradition**, generated as **static JSON** under `data/` by the Node tool described in `docs/DESIGN.md`. Build a **modern, visually stunning, reverent React website** that presents this corpus to everyone from a curious newcomer to a learned practitioner. It must be **client-side only**, **deployable to GitHub Pages with one command**, and **trivially re-syncable** as the translation pipeline keeps producing files. The aesthetic must evoke **Jain culture and sacred art** — dignified, warm, ornamented with restraint. A print PDF is produced separately by the tool and is only a complementary download.

---

## 1. Hard technical requirements (do not deviate)

1. **Stack:** **React 18 + TypeScript + Vite**. Styling: your choice of **Tailwind CSS** (recommended) or CSS Modules — but deliver a real, cohesive **design system** (tokens for color, type, spacing, motifs), not ad-hoc styles. Keep the dependency footprint lean and the production bundle small (code-split per route; lazy-load per-sutra data).
2. **Routing for GitHub Pages:** use **`HashRouter`** (react-router-dom) so deep links work on GitHub Pages with zero server config. Set Vite **`base`** correctly for project pages: `base: '/Panch.Pratikraman/'` (the repo is `Panch.Pratikraman`). All asset and data fetches MUST go through `import.meta.env.BASE_URL` (never absolute `/...`).
3. **One-command deploy to GitHub Pages:** provide BOTH (a) a `gh-pages` npm script (`npm run deploy`) and (b) a ready **GitHub Actions** workflow at `.github/workflows/deploy-pages.yml` that builds and publishes on push to `main`. Document both in the README. The built site must work when served from `https://<user>.github.io/Panch.Pratikraman/`.
4. **Client-side only:** no backend, no DB, no runtime API calls except fetching your own static JSON from `BASE_URL + 'data/...'`. Must work from any static host.
5. **One-command data sync (critical — the data is still being generated):** a Node ESM script `website/scripts/sync-data.mjs`, runnable as `npm run sync-data`, that reads the tool's `../data/` and (re)builds the website's public data bundle under `website/public/data/`. It must be **idempotent, re-runnable at any time, and tolerant of partial/missing data** (the translation run is ongoing). Document: "re-run `npm run sync-data` whenever the tool generates or updates JSON." Bonus: a `--watch` mode.
6. **Three scripts render perfectly:** bundle/self-host **Noto Sans Gujarati**, **Noto Sans Devanagari**, **Noto Serif Devanagari/Gujarati** (or equivalent), and an elegant Latin serif + sans. Verify conjuncts: `જ્ઞ ક્ષ શ્ર` (Gujarati), `ज्ञ क्ष श्र` (Devanagari). Set `lang`/`dir` correctly per block.
7. **Accessibility & performance:** semantic HTML, keyboard navigable, visible focus, WCAG-AA contrast, responsive (mobile → desktop), prefers-reduced-motion respected, Lighthouse ≥ 90 on Performance/Best-Practices/Accessibility for the production build.
8. **Source of truth = the generated JSON.** Never hard-code, paraphrase, "improve," or invent scripture, translations, or commentary in the UI. Render exactly what the data says; where a field is absent, degrade gracefully. Do **not** modify anything under `data/book/`, `data/corpus/pratikraman-structure.json`, `index.js`, `src/`, or `prompts/`.

---

## 2. Information architecture & pages (these are the minimum)

A persistent **header** on every page: the title/wordmark, primary nav (Home · the 5 Pratikramans · Glossary · About), a **global language toggle (EN / ગુ / हि)** persisted to localStorage, and a search affordance. A **footer** with provenance (the source book), the tradition note, and the PDF download link if present. **Breadcrumbs** under the header on inner pages.

### 2.1 Home / Introduction page (rich landing)
A beautiful, scroll-friendly introduction (content grounded in `data/tradition-knowledge/achhalgach.md` and the structure tree — read them; do not fabricate):
- A hero that says "Jain sacred text" at a glance (ornamented, reverent).
- **What is Pancha Pratikramana?** — the meaning of *pratikramaṇa* (turning back: reflection, confession, atonement, renewal) and why it matters **doctrinally** (the six Āvaśyakas; the three jewels; ahiṁsā; the four-fold Saṅgha) and **practically** (daily/fortnightly/seasonal/annual self-review).
- **The Five Pratikramans** as five elegant cards (Devasi, Rai, Pakshik, Chaumasi, Samvatsari) — each with frequency, what it covers, and a clear call-to-action into its page. Convey the **nested/shared structure** (Devasi is the base; Chaumasi & Samvatsari reuse Pakshik with a word-substitution + larger kāyotsarga).
- A short, tasteful note on the **Achhalgach (Vidhipaksha) tradition** and the **golden source book**, plus a "How to read this site" panel (newcomer vs practitioner; the layered content; the recitation lines).

### 2.2 Pratikraman page (`/p/:pratikramanId`)
- Header band: native name + translit + English name, frequency, what it covers, the kāyotsarga measure, and the six-Āvaśyaka legend.
- The **ordered recitation sequence** rendered top-to-bottom: each `sequence` step is either a **vidhi** card (procedural connective text, visually distinct — an "instruction" treatment) or a **sutra** card (prominent, clickable → Sutra page) showing native name, translit, role, and an **Āvaśyaka badge** when present. Mark **shared sutras** (those whose `usedIn` lists more than one pratikraman) with a subtle "shared" indicator.
- **Chaumasi & Samvatsari** have an EMPTY `sequence` + `basedOn: "pakshik"` + `overrides`. Render them as a clear explainer card: "Performed exactly like the **Pakshik** pratikraman, with these differences: replace the word «<from>» with «<to>», and the kāyotsarga becomes «<kausagga>»," with a button to open Pakshik. Do not fabricate a sequence.

### 2.3 Sutra page (`/s/:sutraId`)
- **Preface block at the top** (from `_preface.<lang>.json`): the plain `summary` and `howToRead` shown prominently; `ritualPlacement`, `authorAndSource`, `structureArc`, `recurringImagery`, `keyThemes` in an elegant expandable "About this sutra" panel; the sutra's per-`glossary` available as inline tooltips.
- Then the **shlokas, one by one** (anchored, deep-linkable `#<shlokaId>`), each a **progressive-disclosure** block tuned for the audience ladder (collapsed-by-default scholarly layers):
  1. the **original verse** (`native_script`, Gujarati) set large and beautiful, with a **copy** button;
  2. the **recitation** line (target-script chant line; for English it is IAST) with a copy button — clearly labelled "to recite";
  3. the one-line **plain meaning** (newcomer);
  4. **idiomatic** translation, then **literal** (toggle);
  5. **word-by-word** table (token · IAST translit · gloss · part-of-speech · etymology) — localize the part-of-speech via `pos-labels.json`;
  6. **commentary**, **doctrinal context**, **practical relevance**, **cross-references**, **sources** (as cited links) — expandable.
- A compact **sutra mini-nav** (prev/next shloka, jump-to-verse).

### 2.4 Glossary (`/glossary`) and About (`/about`)
- Glossary: searchable list from `glossary/<lang>.json` (term · script form · definition · which sutras use it, linking back). Glossary terms appearing in commentary/word-by-word should surface their definition on hover/tap site-wide.
- About: the tradition, the source book, the methodology (link to `docs/DESIGN.md` conceptually), credits, and the PDF download.

### 2.5 Cross-cutting features (add these — they raise the site from good to excellent)
- **Search** across sutra names, shloka text/translations, and glossary (client-side index built at data-sync time).
- **"Translation in progress" states** everywhere (the pipeline is still running) — never a crash or a raw 404; show a tasteful placeholder and how-complete indicators.
- **Bookmarks/favorites** (localStorage) and **recently viewed**.
- **Deep-linkable, shareable** shloka URLs; copy-link buttons.
- **Provenance**: show "from the book, p.NN" using `bookPages`/`pdfPages`.
- **Light/dark** themes, both honoring the Jain palette.
- **Print-friendly** sutra view (CSS print stylesheet) as a lightweight complement to the official PDF.
- Smooth, *restrained* micro-interactions (respect reduced-motion).

---

## 3. Visual design language — "Jain culture & sacred art"

Deliver a cohesive, reverent design system. Be **tasteful and respectful** with sacred symbols (use them as refined accents/motifs, never trivially or as clickable gimmicks).

- **Palette:** warm devotional foundations — ivory/parchment grounds, deep maroon/`#7B1E22`-family and saffron/`#E08A1E`-family primaries, with **gold** (`#C9A227`) accents; calm complements from the Jain flag (white, red, saffron, green, deep blue) used sparingly. Ensure AA contrast. A coherent dark theme (deep indigo/charcoal grounds + gold/saffron accents).
- **Typography:** an elegant serif for English display/headings (e.g. a humanist serif) + a clean sans for UI; **Noto Serif/Sans Gujarati & Devanagari** for Indic text, sized generously (Indic body noticeably larger than Latin). Beautiful verse setting (the `native_script` is the visual centerpiece of each shloka).
- **Motifs (used with restraint):** lotus and mandala ornaments; the **daṇḍa/`॥`** as a section divider; subtle border frames evoking manuscript illumination; an optional refined **Ahiṁsā-hand**, **lotus**, or **Siddhachakra**-inspired emblem for the wordmark. Provide them as inline SVG so they scale and theme. Keep whitespace generous and the reading column comfortable.
- **Layout:** card-based navigation, clear hierarchy, sticky header, comfortable measure for long commentary, a quiet "scripture-first" feel. Mobile-first and fully responsive.
- Create a small **`/style` (design-system) route or Storybook-lite page** demonstrating the tokens, type scale, motifs, and the shloka/vidhi/preface components, so the design is reviewable in isolation.

---

## 4. Data model (verified file shapes — read the real files first)

All paths relative to repo root. **Before coding, open and skim:** `data/corpus/pratikraman-structure.json`, `data/corpus/canonical.json`, one `data/translations/<sutraId>/_preface.english.json`, one `data/translations/<sutraId>/<...>__01.english.json`, `data/glossary/english.json`, `data/glossary/pos-labels.json`, and `data/tradition-knowledge/achhalgach.md` (for intro content).

- **`data/corpus/pratikraman-structure.json`** — the backbone. `{ tradition, traditionAliases[], sutras{<sutraId>:{name_native,name_translit,name_en,kind,bookPages,pdfPages[],gathaCount?,smaranNo?,role,usedIn[]}}, pratikramans[{id,name_native,name_translit,name_en,frequency,covers,order,bookPages,isBase?,note?,sharedFrom?,sequence[ {type:"vidhi",id,summary_en,bookPages,avashyaka?} | {type:"sutra",sutraId,avashyaka?,note?} ], basedOn?,overrides?{wordSubstitution{from,to},kausagga} }], appendix{items[...]}, avashyakas[{no,name_prakrit,name_sanskrit,function_en,anchorSutras[]}] }`. Note: `chaumasi`/`samvatsari` have empty `sequence` + `basedOn` + `overrides`. A `vidhi` step currently carries only `summary_en` (English roadmap) — design the vidhi component so a future `native`/`translations` field slots in without a rewrite.
- **`data/corpus/canonical.json`** — verses + provenance. `{ tradition, source, generatedAt, sutras[{ sutraId, name_native, name_translit, name_en, order, kind, script, bookPages, pdfPages[], usedIn[], role, needsVerseExtraction?, shlokas[{ shlokaId:"<sutraId>/NN", number, printedNumber, native_script, script:"gujarati", source_ids:["book"], reconcile_confidence }] }] }`. `needsVerseExtraction:true` ⇒ no verses yet (prose/formula sutra or pending) ⇒ `shlokas:[]` ⇒ show "text pending." Use `printedNumber` for display, `shlokaId`/`number` for identity/order.
- **`data/translations/<sutraId>/_preface.<lang>.json`** (`<lang>` = english|gujarati|hindi) — `{ sutraId, targetLang, targetScript, title, summary, ritualPlacement, authorAndSource, structureArc, recurringImagery, keyThemes[], glossary[{term,scriptForm,definition}], howToRead, sources[{title,url,type,consultedFor}], notes }`.
- **`data/translations/<sutraId>/<shlokaId_safe>.<lang>.json`** (`<shlokaId_safe>` = shlokaId with `/`→`__`, e.g. `nandisutrani-pratham-sajay__01.english.json`) — `{ shlokaId, targetLang, targetScript, plainMeaning, recitation, wordByWord[{token,translit,gloss,partOfSpeech,etymology,notes}], literalTranslation, idiomaticTranslation, elaboration{verseByVerseCommentary,doctrinalContext,practicalRelevance,crossReferences[{text,source}]}, sources[{title,url,type,consultedFor}], translatorConfidence, notes }`. `partOfSpeech` is a stable English enum — localize for display via `pos-labels.json`. `recitation` is target-script (IAST for English); per-token `translit` is always IAST.
- **`data/glossary/<lang>.json`** — `{ lang, generatedAt, terms[{term,scriptForm,definition,sutras[]}] }`. **`data/glossary/pos-labels.json`** — `{ labels:{ <enumKey>:{english,gujarati,hindi} } }`.
- **`data/tradition-knowledge/achhalgach.md`** — authoritative prose for the intro/about pages (the five pratikramans, six Āvaśyakas, doctrinal themes, the sharing model). Quote/condense faithfully; cite the source book; do not invent.
- **`data/pdfs/*.pdf`** (may not exist yet) — the complementary download(s).

### 4.1 The data-sync contract (`npm run sync-data`)
`website/scripts/sync-data.mjs` reads `../data/` and writes a clean, **versioned public bundle** to `website/public/data/` so the app depends on a stable contract, not the generator's layout:
- `index.json` — the structure tree (pratikramans + sequences + overrides), the `sutras{}` registry, `avashyakas`, `appendix`, the `traditionAliases`, plus a derived **availability map**: per `sutraId`, which languages have a preface and how many shlokas are translated per language (so the UI shows progress and avoids 404s). Also a small `intro` block distilled from the KB (or have the app load a copied `achhalgach.md`).
- `sutra/<sutraId>.json` — everything for one sutra, lazy-loaded: its canonical verses + the up-to-three prefaces + all per-shloka translations, **merged by shlokaId × language**, omitting missing pieces gracefully.
- `glossary.json` — the three language glossaries + `pos-labels`.
- `search-index.json` — a compact client search index.
- copy fonts; copy any `data/pdfs/*.pdf`.
Idempotent, re-runnable mid-pipeline; prints a summary (counts + what's missing).

---

## 5. Validation & acceptance (must pass before "done")

Write `website/scripts/validate-data.mjs` (and wire light checks into sync) asserting:
1. Every `sutraId` referenced by any `sequence`/appendix/`avashyaka.anchorSutras` exists in `sutras{}`; every empty-`sequence` pratikraman has `basedOn` + `overrides`.
2. Every emitted `sutra/<id>.json` parses; non-`needsVerseExtraction` sutras have non-empty `native_script` per shloka; present per-shloka files carry the required fields.
3. Script spot-check: Gujarati/Hindi `recitation`+prose are ≥ ~85% target-script; English `recitation` is Latin/IAST.
4. No in-app route target is missing from the bundle; missing translations render the "in progress" state, never an error.
5. `npm run build` produces static assets that work under the GH-Pages `base`; `npm run preview` serves them; routes/deep-links resolve via HashRouter.

Then manually verify: Home shows the intro + 5 pratikraman cards; **Devasi** shows the full vidhi-interleaved sequence; **`nandisutrani-pratham-sajay`** shows the preface + already-translated shlokas with every layered field, working language toggle, glossary tooltips, and a copyable recitation; **Chaumasi/Samvatsari** render as "same as Pakshik + overrides"; the three scripts shape conjuncts correctly; Lighthouse ≥ 90.

---

## 6. Deliverables checklist
- [ ] `website/` — React 18 + TS + Vite app implementing §2 IA and §3 design system, under a GH-Pages `base`, using HashRouter.
- [ ] `website/scripts/sync-data.mjs` (`npm run sync-data`, idempotent, partial-data-tolerant, `--watch`).
- [ ] `website/scripts/validate-data.mjs` (`npm run validate`) — §5 checks passing.
- [ ] `npm run deploy` (gh-pages) **and** `.github/workflows/deploy-pages.yml`.
- [ ] Self-hosted Noto Gujarati/Devanagari + Latin fonts; three scripts verified.
- [ ] Language toggle (EN/ગુ/हि) in header, persisted; progressive disclosure; glossary tooltips; search; bookmarks; deep links; light/dark; print stylesheet; "in progress" handling; provenance; PDF link.
- [ ] A `/style` design-system showcase route.
- [ ] `website/README.md` — install, **`npm run sync-data` (re-run as the tool generates JSON)**, dev, build, validate, and **deploy to GitHub Pages** instructions; note the `base`/HashRouter rationale.
- [ ] `.gitignore` for `website/node_modules` and build output; the synced `website/public/data` may be git-ignored (regenerated) or committed — document the choice.

## 7. First steps for you (the new session)
1. Read `docs/DESIGN.md` (skim), then the real data files listed in §4 to internalize exact shapes. Count files under `data/translations/` — only a subset is translated so far (the pipeline is running); **build for the full corpus but tolerate partial data**.
2. Scaffold `website/` (Vite React-TS), set `base: '/Panch.Pratikraman/'`, install router + styling, wire fonts.
3. Write `sync-data.mjs` + `validate-data.mjs` first; run them; then build the design system (`/style`), then the pages (Home → Pratikraman → Sutra → Glossary/About), then the cross-cutting features.
4. Validate, run `npm run build && npm run preview`, fix everything, confirm GH-Pages deploy config.

Build it to the standard of a publishing-grade Jain devotional-and-scholarly site: reverent, precise, fast, accessible, and genuinely useful to both a curious newcomer and a learned practitioner. The scripture is the hero — let the design serve it.
