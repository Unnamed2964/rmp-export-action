import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parse } from "yaml";
export function loadConfig(configPath) {
    const absolute = resolve(configPath);
    const raw = readFileSync(absolute, "utf-8");
    const config = parse(raw);
    const label = basename(absolute);
    if (!config.exports?.length) {
        throw new Error(`${label}: exports must not be empty`);
    }
    if (!config.rmp?.repository || !config.rmp?.ref) {
        throw new Error(`${label}: rmp.repository and rmp.ref are required`);
    }
    if (!config.acceptRmpExportTermsForRef) {
        throw new Error(`${label}: acceptRmpExportTermsForRef is required. ` +
            "Read RMP export terms in the export dialog for your rmp.ref, then set " +
            "acceptRmpExportTermsForRef to the same value as rmp.ref.");
    }
    if (config.acceptRmpExportTermsForRef !== config.rmp.ref) {
        throw new Error(`${label}: acceptRmpExportTermsForRef (${config.acceptRmpExportTermsForRef}) ` +
            `must match rmp.ref (${config.rmp.ref}). ` +
            "Re-read export terms in the UI for the new RMP version and update the config.");
    }
    return { config, repoRoot: resolve(absolute, "..") };
}
export function resolveRepoPath(repoRoot, relativePath) {
    return resolve(repoRoot, relativePath);
}
