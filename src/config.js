import fs from "node:fs";
import path from "node:path";

const DEFAULTS = {
    copilotModel: "claude-opus-4.8",
    copilotModelLarge: "claude-opus-4.8",
    copilotReasoning: "xhigh",
    copilotContextTier: "long_context",
    copilotConcurrency: 6,
    dataDir: "./data",
    tradition: "achhalgach",
};

function coerceBool(v) {
    const s = String(v).toLowerCase().trim();
    return s === "true" || s === "1" || s === "yes";
}

export function parseConfig(configPath) {
    const content = fs.readFileSync(configPath, "utf-8");
    const configDir = path.dirname(path.resolve(configPath));
    const config = { ...DEFAULTS };

    for (const raw of content.split("\n")) {
        const line = raw.trim();
        if (!line || line.startsWith("#")) continue;
        const i = line.indexOf("=");
        if (i <= 0) continue;
        const key = line.slice(0, i).trim();
        const value = line.slice(i + 1).trim();
        switch (key) {
            case "copilotModel":
            case "copilotModelLarge":
            case "copilotReasoning":
            case "copilotContextTier":
            case "tradition":
                config[key] = value; break;
            case "copilotConcurrency":
                config.copilotConcurrency = Math.min(20, Math.max(1, parseInt(value) || DEFAULTS.copilotConcurrency)); break;
            case "dataDir":
                config.dataDir = path.isAbsolute(value) ? value : path.resolve(configDir, value); break;
        }
    }

    if (!path.isAbsolute(config.dataDir)) {
        config.dataDir = path.resolve(configDir, config.dataDir);
    }
    return config;
}

export function loadConfig(configPath) {
    if (configPath && fs.existsSync(configPath)) return parseConfig(configPath);
    const config = { ...DEFAULTS };
    config.dataDir = path.resolve(process.cwd(), config.dataDir);
    return config;
}

export function ensureDataDirs(config) {
    const d = config.dataDir;
    const dirs = [
        d,
        path.join(d, "book", "pages"),
        path.join(d, "book", "tiles"),
        path.join(d, "tradition-knowledge"),
        path.join(d, "corpus"),
        path.join(d, "translations"),
        path.join(d, "glossary"),
        path.join(d, "quality"),
        path.join(d, "pdfs", "per-sutra"),
        path.join(d, "html", "per-sutra"),
        path.join(d, "logs"),
    ];
    for (const dir of dirs) fs.mkdirSync(dir, { recursive: true });
}
