import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import { Semaphore } from "./semaphore.js";
import { createTempFile, cleanupTempFile } from "./utils/temp-files.js";
import { logger } from "./utils/logger.js";

let _copilotBin = null;
let _copilotSemaphore = null;
let _defaults = {};

export function initCopilot({ concurrency = 6, model, modelLarge, reasoning, contextTier } = {}) {
    _copilotSemaphore = new Semaphore(concurrency);
    _defaults = { model, modelLarge, reasoning, contextTier };
}

// ---------- Binary resolution (Windows-aware) ----------
function resolveCopilotBinary() {
    if (_copilotBin) return _copilotBin;
    if (process.platform !== "win32") { _copilotBin = "copilot"; return _copilotBin; }
    try {
        const out = execSync("where.exe copilot", { encoding: "utf8", timeout: 5000 });
        const candidates = out.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const npmCmd = candidates.find(c => c.toLowerCase().endsWith("copilot.cmd") && c.toLowerCase().includes("\\npm\\"));
        if (npmCmd) { _copilotBin = npmCmd; return _copilotBin; }
        const anyCmd = candidates.find(c => c.toLowerCase().endsWith("copilot.cmd"));
        if (anyCmd) { _copilotBin = anyCmd; return _copilotBin; }
        _copilotBin = candidates.find(c => !c.toLowerCase().endsWith(".bat")) || "copilot";
    } catch { _copilotBin = "copilot"; }
    return _copilotBin;
}

// ---------- Marker / JSON extraction ----------
export function extractMarkerContent(output, startMarker, endMarker) {
    const starts = []; const ends = []; let idx = 0;
    while ((idx = output.indexOf(startMarker, idx)) >= 0) { starts.push(idx); idx += startMarker.length; }
    idx = 0;
    while ((idx = output.indexOf(endMarker, idx)) >= 0) { ends.push(idx); idx += endMarker.length; }
    let bs = -1, be = -1, bl = -1;
    for (const s of starts) for (const e of ends) {
        const len = e - s - startMarker.length;
        if (len > bl && len > 0) { bs = s; be = e; bl = len; }
    }
    if (bs >= 0) return { content: output.slice(bs + startMarker.length, be).trim(), source: "markers" };
    const h = output.match(/^(# .+)$/m);
    if (h) return { content: output.slice(output.indexOf(h[0])).trim(), source: "heading-fallback" };
    return { content: output.trim(), source: "fallback" };
}

export function extractJsonFromOutput(output, startMarker, endMarker) {
    const { content, source } = extractMarkerContent(output, startMarker, endMarker);
    try { return { data: JSON.parse(content), source }; } catch { /* try harder */ }
    const m = content.match(/[\[{][\s\S]*[\]}]/);
    if (m) {
        try { return { data: JSON.parse(m[0]), source: "json-extract" }; } catch {
            const repaired = m[0].replace(/("(?:[^"\\]|\\.)*")/g,
                s => s.replace(/(?<!\\)\n/g, "\\n").replace(/(?<!\\)\r/g, "\\r").replace(/(?<!\\)\t/g, "\\t"));
            try { return { data: JSON.parse(repaired), source: "json-repaired" }; } catch { /* fall */ }
        }
    }
    throw new Error("Failed to extract JSON from Copilot output");
}

// ---------- Invocation ----------
function buildInlinePrompt(tempPath, markers) {
    let p = `Read and follow every instruction in the file @${tempPath} exactly.`;
    if (markers) p += ` Output the result between ${markers.start} and ${markers.end} markers.`;
    return p;
}

function spawnCopilot(cmdParts) {
    return new Promise((resolve, reject) => {
        let child;
        if (process.platform === "win32") {
            child = spawn("cmd.exe", ["/s", "/c", `"${cmdParts.join(" ")}"`], {
                stdio: ["pipe", "pipe", "pipe"], windowsVerbatimArguments: true, env: { ...process.env },
            });
        } else {
            const bin = cmdParts[0].replace(/"/g, "");
            const args = cmdParts.slice(1).map(a => a.replace(/"/g, ""));
            child = spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env } });
        }
        const out = []; const err = [];
        let timer = null;
        let timedOut = false;
        const timeoutMs = parseInt(process.env.PPT_COPILOT_TIMEOUT_MS || "0", 10);
        if (timeoutMs > 0) {
            timer = setTimeout(() => {
                timedOut = true;
                try {
                    if (process.platform === "win32" && child.pid) {
                        execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
                    } else {
                        child.kill("SIGKILL");
                    }
                } catch { /* already gone */ }
            }, timeoutMs);
        }
        child.stdout.on("data", c => out.push(c));
        child.stderr.on("data", c => err.push(c));
        child.on("error", e => { if (timer) clearTimeout(timer); reject(new Error(`Failed to spawn copilot: ${e.message}`)); });
        child.on("close", code => {
            if (timer) clearTimeout(timer);
            const so = Buffer.concat(out).toString("utf8");
            const se = Buffer.concat(err).toString("utf8");
            if (timedOut) reject(new Error(`Copilot CLI timed out after ${timeoutMs}ms`));
            else if (code !== 0) reject(new Error(`Copilot CLI exited with code ${code}\n${se}`));
            else resolve(so);
        });
        child.stdin.end();
    });
}

function buildCmd(prompt, opts) {
    const { model, markers, addDir, reasoning, attachments } = opts;
    const tempPath = createTempFile(prompt, "ppt_prompt");
    const inline = buildInlinePrompt(tempPath, markers);
    const bin = resolveCopilotBinary();
    const noWeb = opts.noWeb || process.env.PPT_NO_WEB === "1";
    const parts = [
        `"${bin}"`, `-p`, `"${inline}"`, `-s`,
        `--no-ask-user`, `--no-custom-instructions`,
    ];
    if (noWeb) {
        // Stay fully non-interactive with tool + path access, but block all URL
        // access so web-fetch tool calls fail fast (denied) instead of hanging
        // on slow/dead endpoints. --deny-url takes precedence over any allow.
        parts.push(`--allow-all-tools`, `--allow-all-paths`, `--deny-url`, `"*"`);
    } else {
        parts.push(`--allow-all`);
    }
    // Image / document attachments (e.g. scanned page tiles for OCR). Order is preserved.
    for (const att of attachments || []) parts.push(`--attachment`, `"${att}"`);
    if (addDir) parts.push(`--add-dir`, `"${addDir}"`);
    const chosenModel = model || _defaults.model;
    if (chosenModel) parts.push(`--model`, chosenModel);
    const r = reasoning ?? _defaults.reasoning;
    if (r) parts.push(`--reasoning-effort`, String(r).toLowerCase());
    const ctx = opts.contextTier ?? _defaults.contextTier;
    if (ctx) parts.push(`--context`, ctx);
    // Web access is via the built-in fetch tool (covered by --allow-all).
    return { parts, tempPath };
}

export async function invokeCopilot(prompt, options = {}) {
    const { markers, retries = 1 } = options;
    const sem = _copilotSemaphore || new Semaphore(1);
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        let tempPath = null;
        try {
            await sem.acquire();
            const built = buildCmd(prompt, options);
            tempPath = built.tempPath;
            logger.debug(`Invoking Copilot CLI (attempt ${attempt + 1})`, "copilot");
            const output = await spawnCopilot(built.parts);
            if (markers) return extractMarkerContent(output, markers.start, markers.end);
            return { content: output, source: "raw" };
        } catch (e) {
            lastErr = e;
            logger.warn(`Copilot CLI attempt ${attempt + 1} failed: ${e.message}`, "copilot");
        } finally {
            cleanupTempFile(tempPath);
            sem.release();
        }
    }
    throw lastErr;
}

export async function invokeCopilotJson(prompt, options = {}) {
    const { markers, retries = 1 } = options;
    const sem = _copilotSemaphore || new Semaphore(1);
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        let tempPath = null;
        try {
            await sem.acquire();
            const built = buildCmd(prompt, options);
            tempPath = built.tempPath;
            logger.debug(`Invoking Copilot CLI JSON (attempt ${attempt + 1})`, "copilot");
            const output = await spawnCopilot(built.parts);
            const startM = markers?.start || "<<<JSON_START>>>";
            const endM = markers?.end || "<<<JSON_END>>>";
            if (process.env.PPT_DUMP_RAW) {
                try {
                    fs.writeFileSync(process.env.PPT_DUMP_RAW, output, "utf8");
                    logger.warn(`Dumped raw output (${output.length} chars) to ${process.env.PPT_DUMP_RAW}`, "copilot");
                } catch { /* ignore dump errors */ }
            }
            return extractJsonFromOutput(output, startM, endM);
        } catch (e) {
            lastErr = e;
            logger.warn(`Copilot CLI JSON attempt ${attempt + 1} failed: ${e.message}`, "copilot");
        } finally {
            cleanupTempFile(tempPath);
            sem.release();
        }
    }
    throw lastErr;
}
