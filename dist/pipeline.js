import { copyFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { resolveRepoPath } from "./config.js";
import { buildPlaceholderValues, prepareJsonWithPlaceholders } from "./placeholders.js";
import { downloadSvgExport, failRmpSession, importMapJson, openRmpSession, } from "./playwright-export.js";
import { rasterizeSvgInPage } from "./playwright-rasterize.js";
import { applyCropToSvg, parseViewBoxFromFile } from "./postprocess/viewbox.js";
import { applyWatermark, ensureWatermarkInFrame, measureRmpInfoGeometry, } from "./postprocess/watermark.js";
import { runHookCommand } from "./exec-tool.js";
import { startRmpServer } from "./rmp-server.js";
function resolveHookCommand(run, svgOutput) {
    return run.replace(/\bRMP\.svg\b/g, svgOutput);
}
export async function runPipeline(options) {
    const { config, repoRoot, version, exportId, dryRun } = options;
    const values = buildPlaceholderValues(version);
    const tmpDir = join(repoRoot, ".tmp");
    const cacheRoot = join(repoRoot, ".cache", "rmp");
    const debugDir = join(tmpDir, "debug");
    const targets = config.exports.filter((item) => !exportId || item.id === exportId);
    if (!targets.length) {
        throw new Error(`No export target matched: ${exportId ?? "(all)"}`);
    }
    if (dryRun) {
        console.log("dry-run: would export", targets.map((t) => t.id).join(", "));
        console.log("version:", values.version, "datetime:", values.datetime);
        return;
    }
    mkdirSync(tmpDir, { recursive: true });
    const server = await startRmpServer({
        repository: config.rmp.repository,
        ref: config.rmp.ref,
        cacheRoot,
    });
    try {
        for (const target of targets) {
            if (target.skip) {
                console.log(`skip: ${target.id}`);
                continue;
            }
            const sourcePath = resolveRepoPath(repoRoot, target.source);
            const preparedJson = join(tmpDir, `${target.id}.json`);
            prepareJsonWithPlaceholders(sourcePath, preparedJson, values);
            const rawSvg = join(tmpDir, `${target.id}.raw.svg`);
            const svgOutput = resolveRepoPath(repoRoot, target.outputs.svg);
            console.log(`export: ${target.id} via RMP`);
            const session = await openRmpSession({
                baseUrl: server.baseUrl,
                debugDir,
                scale: config.defaults.scale,
            });
            try {
                await importMapJson(session.page, preparedJson);
                await downloadSvgExport(session.page, rawSvg);
            }
            catch (error) {
                await failRmpSession(session, "export-failure");
                await session.close();
                throw error;
            }
            copyFileSync(rawSvg, svgOutput);
            if (target.crop) {
                applyCropToSvg(svgOutput, target.crop);
            }
            const frame = target.crop ?? parseViewBoxFromFile(svgOutput);
            if (target.watermark && frame) {
                const svgText = readFileSync(svgOutput, "utf-8");
                const geometry = /id="rmp_info"/.test(svgText)
                    ? measureRmpInfoGeometry(svgText)
                    : null;
                if (geometry) {
                    applyWatermark(svgOutput, frame, target.watermark, geometry);
                    ensureWatermarkInFrame(svgOutput, frame, geometry);
                }
            }
            for (const hook of target.postProcess?.hooks ?? []) {
                if (hook.type !== "command")
                    continue;
                runHookCommand(resolveHookCommand(hook.run, svgOutput), repoRoot);
            }
            if (target.outputs.webp) {
                console.log(`rasterize: ${target.id} via Playwright`);
                try {
                    await rasterizeSvgInPage({
                        page: session.page,
                        svgPath: svgOutput,
                        outputPath: resolveRepoPath(repoRoot, target.outputs.webp),
                        whiteBackground: config.defaults.whiteBackground,
                    });
                }
                catch (error) {
                    await failRmpSession(session, "rasterize-failure");
                    throw error;
                }
            }
            await session.close();
            console.log(`done: ${target.id} -> ${Object.entries(target.outputs)
                .map(([format, path]) => `${format}: ${path}`)
                .join(", ")}`);
        }
    }
    finally {
        server.stop();
        rmSync(tmpDir, { recursive: true, force: true });
    }
}
