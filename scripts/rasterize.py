#!/usr/bin/env python3
"""Rasterize the scanned Panch Pratikraman PDF into OCR-optimized view tiles.

One-time OCR-prep utility (not part of the Node tool). Camera-scanned Gujarati is
dense; multimodal models downsample any image whose long edge exceeds ~1568px, so
a full 400-DPI page (≈4678px tall) loses detail and blurs conjuncts. Instead we
split every page into an overlapping TOP and BOTTOM half, each rendered so its
long edge is ~1568px — roughly doubling the effective resolution the model sees
while keeping each image small (JPEG).

Usage:
  python scripts/rasterize.py [--pdf input/panch_pratikraman.pdf]
                              [--out data/book/tiles]
                              [--manifest data/book/ocr-manifest.json]
                              [--long-edge 1568] [--overlap 0.06]
                              [--first N] [--last N] [--pages 7,8,9] [--quality 92]

Outputs:
  <out>/page-NNN-top.jpg        upper band (0 .. 50%+overlap of page height)
  <out>/page-NNN-bottom.jpg     lower band (50%-overlap .. 100%)
  <manifest>                    { pdf, longEdge, pageCount, pages: [ {page, tiles, status} ] }

Existing per-page `status`/`notes` in the manifest are preserved across re-runs.
"""
import argparse
import datetime
import json
import os
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.stderr.write("PyMuPDF is required: python -m pip install PyMuPDF\n")
    sys.exit(1)


def parse_pages(spec, page_count):
    if spec.get("pages"):
        nums = []
        for part in spec["pages"].split(","):
            part = part.strip()
            if not part:
                continue
            if "-" in part:
                a, b = part.split("-", 1)
                nums.extend(range(int(a), int(b) + 1))
            else:
                nums.append(int(part))
        return sorted(n for n in set(nums) if 1 <= n <= page_count)
    first = spec.get("first") or 1
    last = spec.get("last") or page_count
    return list(range(max(1, first), min(page_count, last) + 1))


def load_manifest(path):
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return {p["page"]: p for p in data.get("pages", [])}
        except (ValueError, KeyError):
            return {}
    return {}


def render_band(page, clip, long_edge, out_path, quality):
    """Render a clipped band so its longest edge ≈ long_edge px; save as JPEG."""
    long_pt = max(clip.width, clip.height)
    zoom = long_edge / long_pt
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=clip, alpha=False)
    pix.save(out_path, jpg_quality=quality)
    return pix.width, pix.height


def main():
    ap = argparse.ArgumentParser(description="Rasterize a scanned PDF into OCR tiles.")
    ap.add_argument("--pdf", default="input/panch_pratikraman.pdf")
    ap.add_argument("--out", default="data/book/tiles")
    ap.add_argument("--manifest", default="data/book/ocr-manifest.json")
    ap.add_argument("--long-edge", type=int, default=1568)
    ap.add_argument("--overlap", type=float, default=0.06)
    ap.add_argument("--quality", type=int, default=92)
    ap.add_argument("--first", type=int, default=0)
    ap.add_argument("--last", type=int, default=0)
    ap.add_argument("--pages", default="")
    args = ap.parse_args()

    if not os.path.exists(args.pdf):
        sys.stderr.write(f"PDF not found: {args.pdf}\n")
        sys.exit(1)

    os.makedirs(args.out, exist_ok=True)
    os.makedirs(os.path.dirname(args.manifest), exist_ok=True)

    doc = fitz.open(args.pdf)
    page_count = doc.page_count
    targets = parse_pages(
        {"first": args.first, "last": args.last, "pages": args.pages}, page_count
    )
    prev = load_manifest(args.manifest)
    out_base = os.path.basename(args.out)

    pages_meta = []
    for n in range(1, page_count + 1):
        existing = prev.get(n, {})
        if n in targets:
            page = doc.load_page(n - 1)
            r = page.rect
            mid = r.height / 2.0
            ov = r.height * args.overlap
            top_clip = fitz.Rect(r.x0, r.y0, r.x1, min(r.y1, mid + ov))
            bot_clip = fitz.Rect(r.x0, max(r.y0, mid - ov), r.x1, r.y1)
            tname, bname = f"page-{n:03d}-top.jpg", f"page-{n:03d}-bottom.jpg"
            tw, th = render_band(page, top_clip, args.long_edge, os.path.join(args.out, tname), args.quality)
            bw, bh = render_band(page, bot_clip, args.long_edge, os.path.join(args.out, bname), args.quality)
            meta = {
                "page": n,
                "tiles": [f"{out_base}/{tname}", f"{out_base}/{bname}"],
                "status": existing.get("status", "pending"),
            }
            if existing.get("notes"):
                meta["notes"] = existing["notes"]
            pages_meta.append(meta)
            print(f"page {n:03d}: top {tw}x{th}, bottom {bw}x{bh}")
        elif existing:
            pages_meta.append(existing)
        else:
            pages_meta.append({"page": n, "status": "not-rendered"})

    manifest = {
        "pdf": args.pdf.replace("\\", "/"),
        "longEdge": args.long_edge,
        "overlap": args.overlap,
        "pageCount": page_count,
        "generatedAt": datetime.datetime.now(datetime.timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z"),
        "rendered": len(targets),
        "pages": pages_meta,
    }
    with open(args.manifest, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    doc.close()
    print(f"\nManifest: {args.manifest}  (pages={page_count}, rendered={len(targets)}, longEdge={args.long_edge})")


if __name__ == "__main__":
    main()
