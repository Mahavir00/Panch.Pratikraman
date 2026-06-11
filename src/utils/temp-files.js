import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

export function createTempFile(content, prefix = "ppt_prompt", ext = ".md") {
    const id = crypto.randomBytes(8).toString("hex");
    const tempPath = path.join(os.tmpdir(), `${prefix}_${Date.now()}_${id}${ext}`);
    fs.writeFileSync(tempPath, content, "utf8");
    return tempPath;
}

export function cleanupTempFile(tempPath) {
    if (tempPath) {
        try { fs.unlinkSync(tempPath); } catch { /* best-effort */ }
    }
}
