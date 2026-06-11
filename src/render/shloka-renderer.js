import fs from "node:fs";
import path from "node:path";
import { shlokaFileBase } from "../utils/slug.js";

// Localized labels for the closed partOfSpeech enum (presentation layer).
const POS_LABELS = (() => {
    try {
        const raw = fs.readFileSync(new URL("../../data/glossary/pos-labels.json", import.meta.url), "utf8");
        return JSON.parse(raw).labels || {};
    } catch { return {}; }
})();
function posLabel(pos, lang) {
    if (!pos) return "";
    const entry = POS_LABELS[String(pos).trim().toLowerCase()];
    return (entry && entry[lang]) || pos;
}

function esc(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c]));
}

function langClass(lang) { return lang === "hindi" ? "hindi" : lang === "gujarati" ? "gujarati" : "english"; }

function renderWordByWord(wbw, lang) {
    if (!Array.isArray(wbw) || wbw.length === 0) return "";
    const rows = wbw.map(w => `
        <tr>
          <td>${esc(w.token)}</td>
          <td>${esc(w.translit || "")}</td>
          <td>${esc(w.gloss || "")}</td>
          <td>${esc(posLabel(w.partOfSpeech, lang))}</td>
          <td>${esc(w.etymology || "")}</td>
        </tr>`).join("");
    return `<table class="wbw">
      <thead><tr><th>Token</th><th>Translit</th><th>Gloss</th><th>POS</th><th>Etymology</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
}

function renderLangBlock(lang, t) {
    if (!t) return `<div class="lang-block ${langClass(lang)}"><h3>${lang} — (missing)</h3></div>`;
    const cls = langClass(lang);
    const cr = (t.elaboration?.crossReferences || []).map(c => `<li>${esc(c.text)} — <em>${esc(c.source || "")}</em></li>`).join("");
    const srcs = (t.sources || []).map(s => `<li><a href="${esc(s.url)}">${esc(s.title || s.url)}</a>${s.type ? ` <span style="color:#888">[${esc(s.type)}]</span>` : ""}</li>`).join("");
    return `
    <div class="lang-block ${cls}">
      <h2><span class="section-label">${lang.toUpperCase()}</span> Translation &amp; Commentary</h2>
      ${t.plainMeaning ? `<p class="plain-meaning"><strong>In brief:</strong> ${esc(t.plainMeaning)}</p>` : ""}
      ${t.recitation ? `<p class="recitation"><strong>Recitation:</strong> <em>${esc(t.recitation)}</em></p>` : ""}
      ${renderWordByWord(t.wordByWord, lang)}
      <h3>Literal Translation</h3><p>${esc(t.literalTranslation)}</p>
      <h3>Idiomatic Translation</h3><p>${esc(t.idiomaticTranslation)}</p>
      <h3>Verse-by-Verse Commentary</h3><div>${esc(t.elaboration?.verseByVerseCommentary).split(/\n+/).map(p => `<p>${p}</p>`).join("")}</div>
      <h3>Doctrinal Context</h3><p>${esc(t.elaboration?.doctrinalContext)}</p>
      <h3>Practical Relevance</h3><p>${esc(t.elaboration?.practicalRelevance)}</p>
      ${cr ? `<h3>Cross References</h3><ul>${cr}</ul>` : ""}
      ${srcs ? `<h3>Sources</h3><ul class="sources">${srcs}</ul>` : ""}
    </div>`;
}

export function loadTranslation(config, sutraId, shlokaId, lang) {
    const base = shlokaFileBase(shlokaId);
    const p = path.join(config.dataDir, "translations", sutraId, `${base}.${lang}.json`);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function renderShlokaHtml({ sutra, shloka, translations }) {
    const nativeCls = shloka.script === "devanagari" ? "devanagari" : shloka.script === "gujarati" ? "gujarati" : "";
    const crumb = `${esc(sutra.name_native || sutra.sutraId)} &nbsp;›&nbsp; Shloka ${esc(shloka.number)}`;
    return `<section class="shloka" id="${esc(shloka.shlokaId.replace(/\//g, "_"))}">
      <div class="crumb">${crumb}</div>
      <div class="native ${nativeCls}">${esc(shloka.native_script)}</div>
      ${["gujarati", "hindi", "english"].map(l => translations[l] ? renderLangBlock(l, translations[l]) : "").join("")}
    </section>`;
}
