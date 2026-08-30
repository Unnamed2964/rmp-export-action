import { execSync } from "node:child_process";
import { resolve } from "node:path";
import * as core from "@actions/core";
import { loadConfig, resolveRepoPath } from "./config.js";
import { buildPlaceholderValues } from "./placeholders.js";
import { runPipeline } from "./pipeline.js";
function ensurePlaywrightChromium() {
    core.info("Ensuring Playwright Chromium is installed…");
    execSync("npx playwright install chromium", { stdio: "inherit" });
}
async function run() {
    const configInput = core.getInput("config") || "rmp-release.yml";
    const version = core.getInput("version", { required: true });
    const exportId = core.getInput("export-id") || undefined;
    const dryRun = core.getInput("dry-run") === "true";
    const configPath = resolve(process.cwd(), configInput);
    const { config, repoRoot } = loadConfig(configPath);
    const values = buildPlaceholderValues(version);
    core.setOutput("version", values.version);
    core.setOutput("datetime", values.datetime);
    if (!dryRun) {
        ensurePlaywrightChromium();
    }
    await runPipeline({
        config,
        repoRoot,
        version,
        exportId,
        dryRun,
    });
    if (!dryRun) {
        for (const target of config.exports) {
            if (exportId && target.id !== exportId)
                continue;
            if (target.skip)
                continue;
            for (const [format, relPath] of Object.entries(target.outputs)) {
                const abs = resolveRepoPath(repoRoot, relPath);
                core.info(`output ${target.id} ${format}: ${abs}`);
            }
        }
    }
}
run().catch((error) => {
    core.setFailed(error instanceof Error ? error.message : String(error));
});
