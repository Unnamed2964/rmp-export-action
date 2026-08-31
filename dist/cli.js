#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig } from "./config.js";
import { buildPlaceholderValues } from "./placeholders.js";
import { runPipeline } from "./pipeline.js";
function parseArgs(argv) {
    let configPath = "rmp-release-config.yml";
    let version;
    let exportId;
    let dryRun = false;
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === "--config" && argv[i + 1]) {
            configPath = argv[++i];
        }
        else if (arg === "--version" && argv[i + 1]) {
            version = argv[++i];
        }
        else if (arg === "--export-id" && argv[i + 1]) {
            exportId = argv[++i];
        }
        else if (arg === "--dry-run") {
            dryRun = true;
        }
        else if (arg === "--help" || arg === "-h") {
            printHelp();
            process.exit(0);
        }
    }
    return { configPath, version, exportId, dryRun };
}
function printHelp() {
    console.log(`Usage: rmp-export [options]

Options:
  --config <path>     Path to rmp-release-config.yml (default: rmp-release-config.yml)
  --version <ver>     Version string, e.g. 0.6.3 or v0.6.3
  --export-id <id>    Export only one target from config
  --dry-run           Print planned actions without exporting
  -h, --help          Show this help
`);
}
async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.version && !args.dryRun) {
        console.error("error: --version is required unless --dry-run is set");
        printHelp();
        process.exit(1);
    }
    const { config, repoRoot } = loadConfig(resolve(args.configPath));
    const values = buildPlaceholderValues(args.version ?? "0.0.0");
    const githubOutput = process.env.GITHUB_OUTPUT;
    if (githubOutput) {
        appendFileSync(githubOutput, `version=${values.version}\n`);
        appendFileSync(githubOutput, `datetime=${values.datetime}\n`);
    }
    await runPipeline({
        config,
        repoRoot,
        version: args.version ?? "0.0.0",
        exportId: args.exportId,
        dryRun: args.dryRun,
    });
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
