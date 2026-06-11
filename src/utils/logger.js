import fs from "node:fs";
import path from "node:path";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

let currentLevel = LEVELS.info;
let _logStream = null;
let _logFilePath = null;

function ts() { return new Date().toISOString().replace("T", " ").slice(0, 19); }
function fmt(level, tag, msg) {
    const prefix = `[${ts()}] [${level.toUpperCase()}]`;
    return tag ? `${prefix} [${tag}] ${msg}` : `${prefix} ${msg}`;
}
function writeToFile(line) { if (_logStream) _logStream.write(line + "\n"); }

export function initLogger(dataDir, runType) {
    const logsDir = path.join(dataDir, "logs");
    fs.mkdirSync(logsDir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
    _logFilePath = path.join(logsDir, `${runType}-${stamp}.log`);
    _logStream = fs.createWriteStream(_logFilePath, { flags: "a" });
    return _logFilePath;
}

export function closeLogger() {
    if (_logStream) { _logStream.end(); _logStream = null; }
}

export function getLogFilePath() { return _logFilePath; }

export function getLatestLogFile(dataDir) {
    const logsDir = path.join(dataDir, "logs");
    if (!fs.existsSync(logsDir)) return null;
    const files = fs.readdirSync(logsDir).filter(f => f.endsWith(".log")).sort();
    if (files.length === 0) return null;
    return path.join(logsDir, files[files.length - 1]);
}

export const logger = {
    setLevel(level) { currentLevel = LEVELS[level] ?? LEVELS.info; },
    debug(msg, tag) { if (currentLevel <= LEVELS.debug) { const l = fmt("debug", tag, msg); console.log(l); writeToFile(l); } },
    info(msg, tag)  { if (currentLevel <= LEVELS.info)  { const l = fmt("info",  tag, msg); console.log(l); writeToFile(l); } },
    warn(msg, tag)  { if (currentLevel <= LEVELS.warn)  { const l = fmt("warn",  tag, msg); console.warn(l); writeToFile(l); } },
    error(msg, tag) { if (currentLevel <= LEVELS.error) { const l = fmt("error", tag, msg); console.error(l); writeToFile(l); } },
};
