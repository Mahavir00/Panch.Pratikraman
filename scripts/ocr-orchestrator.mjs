#!/usr/bin/env node
// OCR orchestrator: transcribe scanned book pages by spawning one Copilot CLI
// process per page (two image tiles attached), in parallel under the shared
// semaphore — the same orchestration pattern the main tool uses for text calls.
//
// Usage:
//   node scripts/ocr-orchestrator.mjs [spec] [--force] [--reasoning <level>]
//                                     [--concurrency <n>] [--limit <n>]
//   spec: "missing" (default) | "all" | "A-B" (range) | "n,m,..." (list)
//
// Output (per page, matching the existing format):
//   data/book/pages/page-NNN.txt
//   data/book/pages/page-NNN.meta.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";
import { initCopilot, invokeCopilotJson } from "../src/copilot.js";
import { initLogger, closeLogger } from "../src/utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config.txt");
const PROMPT_PATH = path.join(ROOT, "prompts", "ocr-page.md");

const PAGE_OFFSET = 18;   // PDF page N => printed book page N + 18 (verified)
const TOTAL_PAGES = 90;

const pad = (n) => String(n).padStart(3, "0");
const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

function parseArgs(argv) {
    const a = { spec: "missing", reasoning: null, concurrency: null, limit: 0, force: false };
    for (let i = 2; i < argv.length; i++) {
        const t = argv[i];
        if (t === "--force") a.force = true;
        else if (t === "--reasoning") a.reasoning = argv[++i];
        else if (t === "--concurrency") a.concurrency = parseInt(argv[++i], 10);
        else if (t === "--limit") a.limit = parseInt(argv[++i], 10);
        else a.spec = t;
    }
    return a;
}

function expandSpec(spec) {
    if (spec === "all" || spec === "missing") return range(1, TOTAL_PAGES);
    if (/^\d+-\d+$/.test(spec)) { const [x, y] = spec.split("-").map(Number); return range(x, y); }
    if (/^\d+(,\d+)*$/.test(spec)) return spec.split(",").map(Number);
    throw new Error(`bad page spec: ${spec}`);
}

const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? String(vars[k]) : ""));

function buildTxt(page, j) {
    const out = [`# page: ${pad(page)}`, `# book_page: ${j.bookPage ?? "?"}`, `# header: ${j.header || "-"}`, ""];
    for (const ln of (j.body || [])) out.push(ln);
    if (Array.isArray(j.footnotes) && j.footnotes.length) {
        out.push("", "--- FOOTNOTES ---");
        for (const f of j.footnotes) out.push(`${f.marker} ${f.text}`);
    }
    return out.join("\n") + "\n";
}

function buildMeta(page, j) {
    return {
        page,
        bookPage: String(j.bookPage ?? "?"),
        header: j.header || "-",
        sutraHeadings: j.sutraHeadings || [],
        verseNumbers: j.verseNumbers || [],
        footnotes: j.footnotes || [],
        uncertain: j.uncertain || [],
        separator: !!j.separator,
    };
}

async function ocrPage(page, tpl, config, reasoning, tilesDir, pagesDir) {
    const top = path.join(tilesDir, `page-${pad(page)}-top.jpg`);
    const bot = path.join(tilesDir, `page-${pad(page)}-bottom.jpg`);
    if (!fs.existsSync(top) || !fs.existsSync(bot)) throw new Error(`missing tiles for page ${page}`);
    const prompt = fill(tpl, { PAGE: String(page), BOOK_PAGE_HINT: String(page + PAGE_OFFSET) });
    const opts = {
        markers: { start: "<<<OCR_START>>>", end: "<<<OCR_END>>>" },
        attachments: [top, bot],
        retries: 1,
    };
    if (reasoning) opts.reasoning = reasoning;
    const t0 = Date.now();
    const { data } = await invokeCopilotJson(prompt, opts);
    if (!data || !Array.isArray(data.body) || data.body.length === 0) throw new Error("OCR JSON had no body[]");
    fs.writeFileSync(path.join(pagesDir, `page-${pad(page)}.txt`), buildTxt(page, data));
    fs.writeFileSync(path.join(pagesDir, `page-${pad(page)}.meta.json`), JSON.stringify(buildMeta(page, data), null, 2));
    return { page, ok: true, secs: ((Date.now() - t0) / 1000).toFixed(0), uncertain: (data.uncertain || []).length, bookPage: data.bookPage };
}

async function main() {
    const args = parseArgs(process.argv);
    const config = loadConfig(CONFIG_PATH);
    initLogger(config.dataDir, "ocr");
    const pagesDir = path.join(config.dataDir, "book", "pages");
    const tilesDir = path.join(config.dataDir, "book", "tiles");
    fs.mkdirSync(pagesDir, { recursive: true });

    let pages = expandSpec(args.spec);
    if (!args.force) pages = pages.filter(n => !fs.existsSync(path.join(pagesDir, `page-${pad(n)}.txt`)));
    if (args.limit > 0) pages = pages.slice(0, args.limit);

    const reasoning = args.reasoning || config.copilotReasoning;
    const concurrency = args.concurrency || config.copilotConcurrency;
    initCopilot({
        concurrency,
        model: config.copilotModel,
        modelLarge: config.copilotModelLarge,
        reasoning,
        contextTier: config.copilotContextTier,
    });

    console.log(`OCR: ${pages.length} page(s) [${pages.map(pad).join(", ")}] | reasoning=${reasoning} | concurrency=${concurrency}`);
    if (pages.length === 0) { console.log("Nothing to do."); closeLogger(); return; }

    const t0 = Date.now();
    let done = 0;
    const tpl = fs.readFileSync(PROMPT_PATH, "utf8");
    const tasks = pages.map(p => (async () => {
        try {
            const r = await ocrPage(p, tpl, config, reasoning, tilesDir, pagesDir);
            done++;
            console.log(`  [${done}/${pages.length}] page ${pad(p)} OK (book ${r.bookPage}, ${r.secs}s${r.uncertain ? `, ${r.uncertain} UNCERTAIN` : ""})`);
            return r;
        } catch (e) {
            done++;
            console.log(`  [${done}/${pages.length}] page ${pad(p)} FAILED: ${e.message}`);
            return { page: p, ok: false, error: e.message };
        }
    })());

    const results = await Promise.all(tasks);
    const ok = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);
    const uncertain = ok.filter(r => r.uncertain > 0);
    console.log(`\nDone in ${((Date.now() - t0) / 1000 / 60).toFixed(1)} min: ${ok.length} ok, ${failed.length} failed.`);
    if (uncertain.length) console.log(`Pages with uncertain glyphs: ${uncertain.map(r => `${pad(r.page)}(${r.uncertain})`).join(", ")}`);
    if (failed.length) console.log(`Failed pages: ${failed.map(r => pad(r.page)).join(", ")}`);
    closeLogger();
}

main().catch(e => { console.error(e); process.exit(1); });
