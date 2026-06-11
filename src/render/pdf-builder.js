import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";
import { Semaphore } from "../semaphore.js";
import { logger } from "../utils/logger.js";

const PDF_POOL = 4;
const pdfSem = new Semaphore(PDF_POOL);

async function htmlFileToPdf(browser, htmlPath, pdfPath) {
    const page = await browser.newPage();
    try {
        await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), { waitUntil: "load" });
        await page.pdf({
            path: pdfPath,
            format: "A4",
            printBackground: true,
            margin: { top: "22mm", bottom: "22mm", left: "18mm", right: "18mm" },
        });
    } finally {
        await page.close();
    }
}

export async function buildSutraPdfs(htmlPaths, config) {
    const browser = await puppeteer.launch({ headless: "new" });
    try {
        const tasks = htmlPaths.map(async ({ sutraId, htmlPath }) => {
            await pdfSem.acquire();
            try {
                const outDir = path.join(config.dataDir, "pdfs", "per-sutra");
                fs.mkdirSync(outDir, { recursive: true });
                const out = path.join(outDir, `${sutraId.replace(/\//g, "_")}.pdf`);
                logger.info(`Rendering PDF: ${sutraId}`, "pdf");
                await htmlFileToPdf(browser, htmlPath, out);
                return { sutraId, pdfPath: out };
            } finally { pdfSem.release(); }
        });
        return Promise.all(tasks);
    } finally {
        await browser.close();
    }
}

export async function mergePdfs(pdfPaths, outputPath) {
    const merged = await PDFDocument.create();
    for (const p of pdfPaths) {
        const bytes = fs.readFileSync(p);
        const doc = await PDFDocument.load(bytes);
        const copied = await merged.copyPages(doc, doc.getPageIndices());
        copied.forEach(pg => merged.addPage(pg));
    }
    const out = await merged.save();
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, out);
    return outputPath;
}
