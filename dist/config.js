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
    if (!config.acceptRmpExportTermsForRef) {
        throw new Error("rmp-release.yml: acceptRmpExportTermsForRef is required. " +
            "Read RMP export terms in the export dialog for your rmp.ref, then set " +
            "acceptRmpExportTermsForRef to the same value as rmp.ref.");
    }
    if (config.acceptRmpExportTermsForRef !== config.rmp.ref) {
        throw new Error(`rmp-release.yml: acceptRmpExportTermsForRef (${config.acceptRmpExportTermsForRef}) ` +
            `must match rmp.ref (${config.rmp.ref}). ` +
            "Re-read export terms in the UI for the new RMP version and update the config.");
    }
    return { config, repoRoot: resolve(absolute, "..") };
}
export function resolveRepoPath(repoRoot, relativePath) {
    return resolve(repoRoot, relativePath);
}
