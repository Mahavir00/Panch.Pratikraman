# Pañca Pratikramaṇa — Translator, Elaborator & Website

A definitive, three-language (**English · ગુજરાતી · हिन्दी**) translation and verse-by-verse
commentary of the **Pancha Pratikramana sūtras** of the **Achhalgach (Anchalgachchha /
Vidhipakṣa)** Śvetāmbara Mūrtipūjaka Jain tradition — built from a single authoritative source (the
tradition's printed edition), published as a website, and downloadable as a print-ready A4 PDF.

> **Live site:** https://mahavir00.github.io/Panch.Pratikraman/
> **Full design:** [docs/DESIGN.md](docs/DESIGN.md)

The repository has two halves that share one dataset:

1. **The generation tool** (repo root) — a Node.js CLI that orchestrates pure code + the GitHub
   Copilot CLI (`claude-opus-4.8`) to transcribe the book, build the canonical corpus, and translate every
   sūtra and vidhi step into all three languages. Output is static JSON under `data/`.
2. **The website** (`website/`) — a client-side React + TypeScript + Vite app that renders that JSON
   in three languages, deployed to **GitHub Pages**.

The corpus is **complete** — 38 sūtras / 474 shlokas + 10 vidhi steps (72 segments), all translated
in three languages — and **committed** under `data/`, so both the website and CI build with **zero
pipeline runs**.

---

## View / develop the website (most common)

No pipeline run needed — the corpus is already committed.

```bash
cd website
npm install
npm run dev        # `predev` syncs ../data into the bundle, then starts Vite
```

Open the printed local URL. To produce a production build / preview:

```bash
npm run build && npm run preview
```

See [website/README.md](website/README.md) for the full website guide.

---

## Deploy to GitHub Pages

Pushing to `main` triggers [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml),
which **syncs the latest `data/` → validates → builds → publishes** to Pages automatically. Enable it
once: **repo Settings → Pages → Build and deployment → Source → GitHub Actions**.

Manual one-shot alternative: `cd website && npm run deploy` (runs `sync-data` + `build`, then publishes
`dist` with `gh-pages`).

---

## Regenerate / extend the corpus (the tool)

Requires the GitHub Copilot CLI (`claude-opus-4.8`) and, for OCR only, Python + PyMuPDF. See
[docs/DESIGN.md §1A](docs/DESIGN.md).

```powershell
npm install
Copy-Item config.example.txt config.txt   # optional; sensible defaults apply without it

# Translate / extend (the book's text is already committed under data/book/):
node index.js build-corpus                                  # deterministic canonical.json from the book
node index.js translate --scope nandisutrani-pratham-sajay  # 1 sūtra, all 3 languages
node index.js vidhi --scope all                             # extract + translate the vidhi/ādeśa text
node index.js render --scope all                            # per-sūtra HTML
node index.js build-pdf                                     # merge the final A4 PDF
node index.js status                                        # coverage stats
```

### Commands

| Command | Purpose |
|---|---|
| `ocr` | Rasterize the source book PDF + transcribe pages (one Copilot vision call/page) → `data/book/` |
| `assemble` | Concatenate pages → `data/book/panch-pratikraman.full.md` |
| `build-corpus` | Deterministically build `data/corpus/canonical.json` from the structure tree + golden pages |
| `translate` | Per-(shloka × lang) translation + elaboration (write-once preface per sūtra) |
| `vidhi` | Extract vidhi/ādeśa text verbatim → `data/corpus/vidhi.json`, and translate it → `data/translations/_vidhi/` (`--extract`/`--translate`; both if neither) |
| `grade` | Quality-grade translations against a rigorous rubric |
| `render` | Generate per-sūtra HTML + per-sūtra PDFs |
| `build-pdf` | Merge per-sūtra PDFs in canonical order into the final PDF |
| `status` | Coverage stats |
| `logs` | Tail the latest log |
| `iterate` | Force-translate → grade → print summary (prompt-tuning loop) |

All commands accept `--scope <sutraId|shlokaId|all>` (where applicable; default
`nandisutrani-pratham-sajay`), `--lang <english,gujarati,hindi|all>`, `-v` (debug), `-c <config>`.

---

## Provenance

The single authoritative source is the tradition's printed edition, transcribed and hand-verified into
`data/book/`. Scripture is **never fabricated** and there is **no web sourcing** of scripture; web
access is used only to consult dictionaries/commentaries during translation. The book's PDF itself is
git-ignored (copyright + size) — see [input/README.md](input/README.md). Full provenance:
[docs/DESIGN.md §14](docs/DESIGN.md).

## Contributing

Edit translations with the tool (or hand-correct the JSON under `data/translations/`), run
`cd website && npm run sync-data` to preview, then commit the changed `data/**` and push — CI
redeploys. Before committing tool changes, run the checks in
[docs/DESIGN.md §19](docs/DESIGN.md). See [docs/DESIGN.md](docs/DESIGN.md) for module-level details,
the prompt catalog, output schemas, and the quality iteration workflow.
