import fs from "node:fs";
import path from "node:path";
import { invokeCopilotJson } from "../copilot.js";
import { logger } from "../utils/logger.js";
import { shlokaFileBase } from "../utils/slug.js";
import { isScopeMatch } from "./translation-orchestrator.js";

const PROMPT_PATH = new URL("../../prompts/quality-grader.md", import.meta.url);
const LANGS = ["english", "gujarati", "hindi"];

function fill(tpl, vars) { return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? String(vars[k]) : "")); }

async function gradeOne({ sutra, shloka, lang, translation, config }) {
    const tpl = fs.readFileSync(PROMPT_PATH, "utf8");
    const prompt = fill(tpl, {
        SUTRA_ID: sutra.sutraId,
        SUTRA_NAME_NATIVE: sutra.name_native || "",
        SHLOKA_ID: shloka.shlokaId,
        SHLOKA_NATIVE: shloka.native_script || "",
        TARGET_LANG: lang,
        TARGET_SCRIPT: { english: "latin", gujarati: "gujarati", hindi: "devanagari" }[lang],
        TRANSLATION_JSON: JSON.stringify(translation, null, 2),
    });
    const { data } = await invokeCopilotJson(prompt, {
        model: config.copilotModelLarge,
        markers: { start: "<<<GRADE_START>>>", end: "<<<GRADE_END>>>" },
        retries: 1,
    });
    return data;
}

export async function gradeScope({ canonical, scope, langs, config, sample = 0 }) {
    const tasks = [];
    let count = 0;
    for (const sutra of canonical.sutras) {
        for (const shloka of sutra.shlokas) {
            if (!isScopeMatch(scope, sutra, shloka)) continue;
            for (const lang of langs) {
                if (sample > 0 && count >= sample) break;
                const base = shlokaFileBase(shloka.shlokaId);
                const tp = path.join(config.dataDir, "translations", sutra.sutraId, `${base}.${lang}.json`);
                if (!fs.existsSync(tp)) {
                    logger.warn(`No translation file for ${shloka.shlokaId} [${lang}]`, "grade");
                    continue;
                }
                count++;
                const translation = JSON.parse(fs.readFileSync(tp, "utf8"));
                tasks.push((async () => {
                    try {
                        const grade = await gradeOne({ sutra, shloka, lang, translation, config });
                        return { shlokaId: shloka.shlokaId, lang, grade };
                    } catch (e) {
                        logger.error(`Grade failed ${shloka.shlokaId} [${lang}]: ${e.message}`, "grade");
                        return { shlokaId: shloka.shlokaId, lang, error: e.message };
                    }
                })());
            }
        }
    }
    const results = await Promise.all(tasks);
    const reportPath = path.join(config.dataDir, "quality", `${Date.now()}.report.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
    return { reportPath, results };
}

export { LANGS };
