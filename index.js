#!/usr/bin/env node
import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadConfig, ensureDataDirs } from "./src/config.js";
import { initCopilot } from "./src/copilot.js";
import { initLogger, closeLogger, getLatestLogFile, logger } from "./src/utils/logger.js";

import { buildCanonical, loadCanonical, loadStructure } from "./src/corpus/canonical-builder.js";
import { validateCanonical, validateVidhi, validateVidhiTranslations } from "./src/corpus/validator.js";
import { translateScope } from "./src/intelligence/translation-orchestrator.js";
import { extractVidhiScope, translateVidhiScope, loadVidhi, enumerateVidhiSteps } from "./src/intelligence/vidhi-orchestrator.js";
import { gradeScope, LANGS as ALL_LANGS } from "./src/intelligence/quality-grader.js";
import { writeSutraHtml } from "./src/render/sutra-renderer.js";
import { buildSutraPdfs, mergePdfs } from "./src/render/pdf-builder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCOPE = "nandisutrani-pratham-sajay";

function bootstrap(opts) {
    const config = loadConfig(opts.config);
    // Per-run overrides (e.g. `translate --model claude-opus-4.7 --reasoning max`).
    if (opts.model) { config.copilotModel = opts.model; config.copilotModelLarge = opts.model; }
    if (opts.reasoning) config.copilotReasoning = opts.reasoning;
    if (opts.context) config.copilotContextTier = opts.context;
    ensureDataDirs(config);
    initLogger(config.dataDir, opts._cmd || "ppt");
    initCopilot({
        concurrency: config.copilotConcurrency,
        model: config.copilotModel,
        modelLarge: config.copilotModelLarge,
        reasoning: config.copilotReasoning,
        contextTier: config.copilotContextTier,
    });
    if (opts.verbose) logger.setLevel("debug");
    return config;
}

function parseLangs(s) {
    if (!s || s === "all") return ALL_LANGS;
    return s.split(",").map(x => x.trim().toLowerCase()).filter(l => ALL_LANGS.includes(l));
}

const program = new Command();
program.name("ppt").description("Panch Pratikraman translator & elaborator (Achhalgach tradition)").version("1.0.0");
program.option("-c, --config <path>", "config file path", "config.txt");
program.option("-v, --verbose", "debug logging");

function runScript(scriptRel, args, label) {
    const script = path.join(__dirname, scriptRel);
    const isPy = scriptRel.endsWith(".py");
    const cmd = isPy ? "python" : process.execPath;
    const argv = isPy ? [script, ...args] : [script, ...args];
    logger.info(`Running ${label}: ${cmd} ${argv.join(" ")}`, label);
    const r = spawnSync(cmd, argv, { stdio: "inherit", cwd: __dirname });
    if (r.status !== 0) throw new Error(`${label} exited with code ${r.status}`);
}

program.command("ocr")
    .description("Transcribe the source book: rasterize pages to tiles, then transcribe via Copilot CLI (one process per page)")
    .option("--pages <spec>", "page spec: missing | all | A-B | n,m,...", "missing")
    .option("--concurrency <n>", "parallel Copilot OCR processes")
    .option("--reasoning <level>", "reasoning effort for OCR (e.g. high)")
    .option("--force", "re-OCR pages even if already transcribed")
    .option("--skip-rasterize", "assume tiles already exist; skip the rasterize step")
    .action((cmdOpts, cmd) => {
        const opts = { ...program.opts(), ...cmd.optsWithGlobals?.(), _cmd: "ocr" };
        const config = bootstrap(opts);
        try {
            if (!cmdOpts.skipRasterize) runScript("scripts/rasterize.py", [], "rasterize");
            const a = [cmdOpts.pages || "missing"];
            if (cmdOpts.force) a.push("--force");
            if (cmdOpts.reasoning) a.push("--reasoning", cmdOpts.reasoning);
            if (cmdOpts.concurrency) a.push("--concurrency", String(cmdOpts.concurrency));
            runScript("scripts/ocr-orchestrator.mjs", a, "ocr");
            logger.info("OCR pass complete. Verify uncertain pages, then run `ppt assemble`.", "ocr");
        } finally { closeLogger(); }
    });

program.command("assemble")
    .description("Assemble the per-page OCR text into the golden book document + mark the manifest verified")
    .action((_, cmd) => {
        const opts = { ...program.opts(), ...cmd.optsWithGlobals?.(), _cmd: "assemble" };
        const config = bootstrap(opts);
        try {
            runScript("scripts/assemble-book.mjs", [], "assemble");
        } finally { closeLogger(); }
    });

program.command("build-corpus")
    .alias("reconcile")
    .description("Build the canonical corpus deterministically from the structure tree + golden OCR pages")
    .action((_, cmd) => {
        const opts = { ...program.opts(), ...cmd.optsWithGlobals?.(), _cmd: "build-corpus" };
        const config = bootstrap(opts);
        try {
            const { path: out, canonical, stats } = buildCanonical(config);
            const v = validateCanonical(canonical);
            if (v.ok) logger.info(`Canonical validated OK: ${out} (${stats.sutras} sutras, ${stats.totalShlokas} shlokas)`, "build-corpus");
            else logger.warn(`Canonical issues:\n  - ${v.issues.join("\n  - ")}`, "build-corpus");
        } finally { closeLogger(); }
    });

program.command("translate")
    .description("Translate + elaborate shlokas in scope (default scope: first sutra)")
    .option("-s, --scope <id>", "sutraId, shlokaId, or 'all'", DEFAULT_SCOPE)
    .option("-l, --lang <list>", "comma-separated: english,gujarati,hindi or 'all'", "all")
    .option("-f, --force", "regenerate even if file exists")
    .option("--max <n>", "max shlokas to translate (per pass)", "0")
    .option("--model <id>", "override model for this run (e.g. claude-opus-4.7)")
    .option("--reasoning <level>", "override reasoning effort (none|low|medium|high|xhigh|max)")
    .option("--context <tier>", "override context tier (default|long_context)")
    .action(async (cmdOpts, cmd) => {
        const opts = { ...program.opts(), ...cmd.optsWithGlobals?.(), _cmd: "translate" };
        const config = bootstrap(opts);
        try {
            const canonical = loadCanonical(config);
            if (!canonical) throw new Error("No canonical corpus — run `ppt build-corpus` first.");
            const langs = parseLangs(cmdOpts.lang);
            const max = parseInt(cmdOpts.max, 10) || 0;
            const results = await translateScope({ canonical, scope: cmdOpts.scope, langs, config, force: !!cmdOpts.force, max });
            const ok = results.filter(r => r.ok).length;
            console.log(`\nTranslated ${ok}/${results.length}.`);
        } finally { closeLogger(); }
    });

program.command("vidhi")
    .description("Extract + translate the vidhi/ādeśa procedural text (Phase A --extract, Phase B --translate; both if neither)")
    .option("--extract", "Phase A only: extract verbatim native vidhi segments from the golden pages -> data/corpus/vidhi.json")
    .option("--translate", "Phase B only: translate already-extracted vidhi steps -> data/translations/_vidhi/")
    .option("-s, --scope <id>", "all | pratikramanId (e.g. devasi) | vidhiId (e.g. devasi-iriya-adesh)", "all")
    .option("-l, --lang <list>", "comma-separated: english,gujarati,hindi or 'all'", "all")
    .option("-f, --force", "regenerate even if the artifact exists")
    .option("--max <n>", "max units per pass (0 = unlimited)", "0")
    .action(async (cmdOpts, cmd) => {
        const opts = { ...program.opts(), ...cmd.optsWithGlobals?.(), _cmd: "vidhi" };
        const config = bootstrap(opts);
        try {
            const structure = loadStructure(config);
            const langs = parseLangs(cmdOpts.lang);
            const max = parseInt(cmdOpts.max, 10) || 0;
            const doExtract = !!cmdOpts.extract;
            const doTranslate = !!cmdOpts.translate;
            const both = !doExtract && !doTranslate;

            let vidhi = loadVidhi(config);
            if (doExtract || both) {
                const res = await extractVidhiScope({ structure, scope: cmdOpts.scope, config, force: !!cmdOpts.force, max });
                vidhi = res.vidhi;
                console.log(`\nExtracted ${res.extracted} vidhi step(s); corpus now holds ${vidhi.steps.length} steps / ${res.totalSegments} segments.`);
            }
            if (doTranslate || both) {
                if (!vidhi) vidhi = loadVidhi(config);
                if (!vidhi) throw new Error("No data/corpus/vidhi.json — run `ppt vidhi --extract` first.");
                const results = await translateVidhiScope({ structure, vidhi, scope: cmdOpts.scope, langs, config, force: !!cmdOpts.force, max });
                const ok = results.filter(r => r.ok).length;
                console.log(`Translated ${ok}/${results.length} vidhi (step × lang).`);
            }

            // Validate the native layer (+ the translation layer if it exists).
            const finalVidhi = loadVidhi(config);
            const v = validateVidhi(structure, finalVidhi);
            if (v.ok) logger.info("Vidhi native layer validated OK", "vidhi");
            else logger.warn(`Vidhi native issues:\n  - ${v.issues.join("\n  - ")}`, "vidhi");
            const vt = validateVidhiTranslations(config, finalVidhi, langs);
            if (!vt.ok) logger.warn(`Vidhi translation issues:\n  - ${vt.issues.join("\n  - ")}`, "vidhi");
        } finally { closeLogger(); }
    });

program.command("grade")
    .description("Run the quality grader on translations in scope")
    .option("-s, --scope <id>", "sutraId, shlokaId, or 'all'", DEFAULT_SCOPE)
    .option("-l, --lang <list>", "languages", "all")
    .option("--sample <n>", "limit graded items", "0")
    .action(async (cmdOpts, cmd) => {
        const opts = { ...program.opts(), ...cmd.optsWithGlobals?.(), _cmd: "grade" };
        const config = bootstrap(opts);
        try {
            const canonical = loadCanonical(config);
            if (!canonical) throw new Error("No canonical corpus.");
            const langs = parseLangs(cmdOpts.lang);
            const { reportPath, results } = await gradeScope({
                canonical, scope: cmdOpts.scope, langs, config, sample: parseInt(cmdOpts.sample, 10) || 0,
            });
            const avg = results.filter(r => r.grade?.overall != null).map(r => r.grade.overall);
            const mean = avg.length ? (avg.reduce((a, b) => a + b, 0) / avg.length).toFixed(2) : "n/a";
            console.log(`\nGraded ${results.length} items. Mean overall: ${mean}. Report: ${reportPath}`);
        } finally { closeLogger(); }
    });

program.command("render")
    .description("Render HTML + per-sutra PDFs for scope")
    .option("-s, --scope <id>", "sutraId or 'all'", DEFAULT_SCOPE)
    .option("-l, --lang <list>", "languages", "all")
    .action(async (cmdOpts, cmd) => {
        const opts = { ...program.opts(), ...cmd.optsWithGlobals?.(), _cmd: "render" };
        const config = bootstrap(opts);
        try {
            const canonical = loadCanonical(config);
            if (!canonical) throw new Error("No canonical corpus.");
            const langs = parseLangs(cmdOpts.lang);
            const sutras = canonical.sutras.filter(s => cmdOpts.scope === "all" || s.sutraId === cmdOpts.scope);
            if (sutras.length === 0) throw new Error(`Scope matched no sutras: ${cmdOpts.scope}`);
            const htmlPaths = sutras.map(sutra => ({ sutraId: sutra.sutraId, htmlPath: writeSutraHtml({ sutra, langs, config }) }));
            const pdfs = await buildSutraPdfs(htmlPaths, config);
            console.log(`\nRendered ${pdfs.length} per-sutra PDFs.`);
        } finally { closeLogger(); }
    });

program.command("build-pdf")
    .description("Merge per-sutra PDFs in canonical order into the final PDF")
    .option("-s, --scope <id>", "sutraId or 'all'", "all")
    .action(async (cmdOpts, cmd) => {
        const opts = { ...program.opts(), ...cmd.optsWithGlobals?.(), _cmd: "build-pdf" };
        const config = bootstrap(opts);
        try {
            const canonical = loadCanonical(config);
            if (!canonical) throw new Error("No canonical corpus.");
            const sutras = canonical.sutras
                .filter(s => cmdOpts.scope === "all" || s.sutraId === cmdOpts.scope)
                .sort((a, b) => a.order - b.order);
            const pdfPaths = sutras
                .map(s => path.join(config.dataDir, "pdfs", "per-sutra", `${s.sutraId.replace(/\//g, "_")}.pdf`))
                .filter(p => fs.existsSync(p));
            if (pdfPaths.length === 0) throw new Error("No per-sutra PDFs found. Run `ppt render` first.");
            const out = path.join(config.dataDir, "pdfs", `panch-pratikraman-${config.tradition}${cmdOpts.scope === "all" ? "" : "-" + cmdOpts.scope}.pdf`);
            await mergePdfs(pdfPaths, out);
            console.log(`\nFinal PDF: ${out}`);
        } finally { closeLogger(); }
    });

program.command("status")
    .description("Show corpus + translation coverage stats")
    .action((_, cmd) => {
        const opts = { ...program.opts(), ...cmd.optsWithGlobals?.(), _cmd: "status" };
        const config = bootstrap(opts);
        try {
            const canonical = loadCanonical(config);
            const bookPagesDir = path.join(config.dataDir, "book", "pages");
            const nPages = fs.existsSync(bookPagesDir) ? fs.readdirSync(bookPagesDir).filter(f => f.endsWith(".txt")).length : 0;
            console.log(`Golden book: ${nPages}/90 pages OCR'd`);
            const structPath = path.join(config.dataDir, "corpus", "pratikraman-structure.json");
            if (fs.existsSync(structPath)) {
                const st = JSON.parse(fs.readFileSync(structPath, "utf8"));
                console.log(`Structure:   ${st.pratikramans.length} pratikramans / ${Object.keys(st.sutras).length} unique sutras`);
            }
            if (!canonical) { console.log("Corpus:    (not built yet — run `ppt build-corpus`)"); return; }
            const nSutras = canonical.sutras.length;
            const nShlokas = canonical.sutras.reduce((a, s) => a + (s.shlokas?.length || 0), 0);
            console.log(`Corpus:    ${nSutras} sutras / ${nShlokas} shlokas`);
            const tDir = path.join(config.dataDir, "translations");
            const perLang = { english: 0, gujarati: 0, hindi: 0 };
            if (fs.existsSync(tDir)) {
                for (const sutra of canonical.sutras) {
                    const d = path.join(tDir, sutra.sutraId);
                    if (!fs.existsSync(d)) continue;
                    for (const f of fs.readdirSync(d)) {
                        if (f.endsWith(".english.json")) perLang.english++;
                        else if (f.endsWith(".gujarati.json")) perLang.gujarati++;
                        else if (f.endsWith(".hindi.json")) perLang.hindi++;
                    }
                }
            }
            for (const l of ALL_LANGS) console.log(`  ${l.padEnd(9)} ${perLang[l]}/${nShlokas}`);

            // Vidhi coverage (native extraction + per-language translation).
            if (fs.existsSync(structPath)) {
                const st = JSON.parse(fs.readFileSync(structPath, "utf8"));
                const totalVidhi = enumerateVidhiSteps(st).length;
                const vidhi = loadVidhi(config);
                const vSteps = vidhi?.steps || [];
                const extracted = vSteps.filter(s => !s.needsExtraction && (s.segments?.length || 0) > 0).length;
                const needs = vSteps.filter(s => s.needsExtraction).length;
                const segTotal = vSteps.reduce((a, s) => a + (s.segments?.length || 0), 0);
                console.log(`Vidhi:     ${extracted}/${totalVidhi} steps extracted (${segTotal} segments${needs ? `; ${needs} needsExtraction` : ""})`);
                const vDir = path.join(config.dataDir, "translations", "_vidhi");
                const vPerLang = { english: 0, gujarati: 0, hindi: 0 };
                if (fs.existsSync(vDir)) {
                    for (const f of fs.readdirSync(vDir)) {
                        for (const l of ALL_LANGS) if (f.endsWith(`.${l}.json`)) vPerLang[l]++;
                    }
                }
                for (const l of ALL_LANGS) console.log(`  ${l.padEnd(9)} ${vPerLang[l]}/${extracted}`);
            }
        } finally { closeLogger(); }
    });

program.command("logs")
    .description("Print the latest log file (tail -n)")
    .option("-n, --lines <n>", "tail lines", "100")
    .action((cmdOpts, cmd) => {
        const opts = { ...program.opts(), ...cmd.optsWithGlobals?.(), _cmd: "logs" };
        const config = loadConfig(opts.config);
        const p = getLatestLogFile(config.dataDir);
        if (!p) return console.log("No logs yet.");
        const lines = fs.readFileSync(p, "utf8").split("\n");
        const n = parseInt(cmdOpts.lines, 10) || 100;
        console.log(lines.slice(-n).join("\n"));
        console.log(`\n(${p})`);
    });

program.command("iterate")
    .description("Translate -> grade -> print summary (prompt-tuning loop)")
    .option("-s, --scope <id>", "shlokaId or sutraId", DEFAULT_SCOPE)
    .option("-l, --lang <list>", "languages", "all")
    .option("--max <n>", "max shlokas per pass", "3")
    .action(async (cmdOpts, cmd) => {
        const opts = { ...program.opts(), ...cmd.optsWithGlobals?.(), _cmd: "iterate" };
        const config = bootstrap(opts);
        try {
            const canonical = loadCanonical(config);
            if (!canonical) throw new Error("No canonical corpus.");
            const langs = parseLangs(cmdOpts.lang);
            const max = parseInt(cmdOpts.max, 10) || 3;
            await translateScope({ canonical, scope: cmdOpts.scope, langs, config, force: true, max });
            const { reportPath, results } = await gradeScope({ canonical, scope: cmdOpts.scope, langs, config });
            console.log("\n--- ITERATE SUMMARY ---");
            for (const r of results) {
                const g = r.grade;
                if (!g) { console.log(`${r.shlokaId} [${r.lang}] ERROR: ${r.error}`); continue; }
                console.log(`${r.shlokaId} [${r.lang}] overall=${g.overall} verdict=${g.verdict}`);
                if (g.issues?.length) for (const i of g.issues) console.log(`   - ${i}`);
            }
            console.log(`\nReport: ${reportPath}`);
        } finally { closeLogger(); }
    });

program.parseAsync(process.argv).catch(e => {
    logger.error(e.stack || e.message, "fatal");
    closeLogger();
    process.exit(1);
});
