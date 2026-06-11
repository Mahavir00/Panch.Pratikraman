# `input/` — the scanned source book

This folder holds the **single golden source** for the whole project: a camera-scanned copy
of the printed book

> **_Pañca Pratikramaṇa Sūtra — Vidhi Sahit_** (Anchalgachchha / Vidhipakṣa Gaccha edition)

expected at:

```
input/panch_pratikraman.pdf
```

## Why it is not in the repository

The PDF (~44 MB) is a scan of a **copyrighted printed book**, so it is **git-ignored**
(`input/*.pdf`) and is **not redistributed** here.

You do **not** need it for normal work. The book has already been OCR'd, hand-verified, and
committed as the working golden source:

| Committed artifact | What it is |
|---|---|
| `data/book/pages/page-NNN.txt` | verbatim per-page OCR (90 pages, hand-verified) |
| `data/book/panch-pratikraman.full.md` | the assembled golden document |
| `data/book/ocr-manifest.json` | per-page OCR status |

Every sūtra, gāthā, and vidhi line in `data/corpus/` and `data/translations/` traces back to
those committed pages — see [docs/DESIGN.md](../docs/DESIGN.md) §14 (Data Integrity).

## When you actually need the PDF

Only to **re-run OCR from scratch** (`node index.js ocr`) — e.g. to re-transcribe a page or
re-rasterize the tiles. In that case, place your own scan at `input/panch_pratikraman.pdf`
(book pages 19–108, the scan begins at book p.19) and run:

```powershell
node index.js ocr        # rasterize + transcribe → data/book/pages/*
node index.js assemble   # → data/book/panch-pratikraman.full.md
```
