import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
export function loadConfig(configPath) {
    const absolute = resolve(configPath);
    const raw = readFileSync(absolute, "utf-8");
    const config = parse(raw);
    if (!config.exports?.length) {
        throw new Error("rmp-release.yml: exports must not be empty");
    }
    if (!config.rmp?.repository || !config.rmp?.ref) {
        throw new Error("rmp-release.yml: rmp.repository and rmp.ref are required");
    }
    return { config, repoRoot: resolve(absolute, "..") };
}
export function resolveRepoPath(repoRoot, relativePath) {
    return resolve(repoRoot, relativePath);
}
