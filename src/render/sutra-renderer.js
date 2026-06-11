import fs from "node:fs";
import path from "node:path";
import { renderShlokaHtml, loadTranslation } from "./shloka-renderer.js";

const CSS_PATH = new URL("../../templates/print.css", import.meta.url);

function pageHead(title) {
    const css = fs.readFileSync(CSS_PATH, "utf8");
    return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>`;
}

export function renderSutraHtml({ sutra, langs, config }) {
    const cover = `<div class="cover"><h1>${sutra.name_native || sutra.sutraId}</h1>
      <div class="sub">${sutra.name_translit || ""}</div>
      <div class="sub">${sutra.name_en || ""}</div>
      <div class="sub" style="margin-top:10mm;">Sutra ${sutra.order} — ${sutra.shlokas.length} shlokas</div></div>`;
    const sections = sutra.shlokas.map(shloka => {
        const translations = {};
        for (const l of langs) translations[l] = loadTranslation(config, sutra.sutraId, shloka.shlokaId, l);
        return renderShlokaHtml({ sutra, shloka, translations });
    }).join("\n");
    return `${pageHead(sutra.name_en || sutra.sutraId)}${cover}<hr/>${sections}</body></html>`;
}

export function writeSutraHtml({ sutra, langs, config }) {
    const html = renderSutraHtml({ sutra, langs, config });
    const dir = path.join(config.dataDir, "html", "per-sutra");
    fs.mkdirSync(dir, { recursive: true });
    const out = path.join(dir, `${sutra.sutraId.replace(/\//g, "_")}.html`);
    fs.writeFileSync(out, html, "utf8");
    return out;
}
