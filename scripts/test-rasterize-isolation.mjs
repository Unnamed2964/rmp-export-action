#!/usr/bin/env node
/**
 * Local isolation test: fake export UI overlay + RMP.svg → WebP.
 * Pass: top-left 64×64 region is solid white (no red "Export" mock UI).
 *
 * Usage: node scripts/test-rasterize-isolation.mjs [path/to/RMP.svg]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";
import { rasterizeSvgInPage } from "../dist/playwright-rasterize.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = resolve(process.argv[2] ?? join(ROOT, "../yanji-metro-draft/RMP.svg"));
const outDir = join(ROOT, ".tmp-rasterize-test");
const webpPath = join(outDir, "test.webp");

async function main() {
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html><body style="margin:0;background:#ccc">
      <div id="root" style="width:100vw;height:100vh;background:linear-gradient(#eee,#999)">
        <p style="padding:16px">RMP app background (should not appear in WebP)</p>
      </div>
      <div role="dialog" style="position:fixed;left:16px;top:16px;z-index:9999;
        width:320px;height:200px;background:#ff0000;color:#fff;padding:12px;font:16px sans-serif">
        Export image — Format SVG — Download (mock UI)
      </div>
    </body></html>
  `);

  await rasterizeSvgInPage({
    page,
    svgPath,
    outputPath: webpPath,
    whiteBackground: true,
  });

  await browser.close();

  const meta = await sharp(webpPath).metadata();
  const cropW = Math.min(64, meta.width ?? 64);
  const cropH = Math.min(64, meta.height ?? 64);
  const { data, info: cropInfo } = await sharp(webpPath)
    .extract({ left: 0, top: 0, width: cropW, height: cropH })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let redPixels = 0;
  for (let i = 0; i < data.length; i += cropInfo.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 200 && g < 80 && b < 80) redPixels += 1;
  }

  const total = cropInfo.width * cropInfo.height;
  const redRatio = redPixels / total;
  console.log("svg:", svgPath);
  console.log("webp:", webpPath, `${meta.width}×${meta.height}`);
  console.log("top-left red pixel ratio:", redRatio.toFixed(4));

  if (redRatio > 0.01) {
    console.error("FAIL: export UI bleed detected in top-left region");
    process.exit(1);
  }

  console.log("PASS: no export UI bleed in top-left region");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
