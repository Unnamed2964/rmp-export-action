import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname } from "node:path";
import type { Page } from "playwright";
import sharp from "sharp";
import { parseViewBox } from "./postprocess/viewbox.js";

export type RasterFormat = "webp" | "png";

export interface PlaywrightRasterizeOptions {
  page: Page;
  svgPath: string;
  outputPath: string;
  whiteBackground: boolean;
}

const RASTER_HOST_ID = "rmp-export-raster-host";

export function rasterFormatFromPath(outputPath: string): RasterFormat {
  const ext = extname(outputPath).toLowerCase();
  if (ext === ".webp") return "webp";
  if (ext === ".png") return "png";
  throw new Error(
    `Unsupported raster output extension "${ext}" (use .webp or .png): ${outputPath}`,
  );
}

function parseSvgDimensions(svg: string): { width: number; height: number } {
  const viewBox = parseViewBox(svg);
  if (viewBox) {
    return { width: viewBox.width, height: viewBox.height };
  }

  const widthMatch = svg.match(/<svg\b[^>]*\bwidth="([^"]+)"/);
  const heightMatch = svg.match(/<svg\b[^>]*\bheight="([^"]+)"/);
  const width = widthMatch ? Number.parseFloat(widthMatch[1]) : Number.NaN;
  const height = heightMatch ? Number.parseFloat(heightMatch[1]) : Number.NaN;
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error("SVG missing viewBox and width/height for rasterization");
  }
  return { width, height };
}

async function isolatePageForRasterize(page: Page): Promise<void> {
  await page.evaluate(() => {
    document
      .querySelectorAll('[role="dialog"], .chakra-modal__overlay, .chakra-modal__content-container')
      .forEach((node) => node.remove());
    const root = document.getElementById("root");
    if (root) {
      root.style.setProperty("visibility", "hidden", "important");
    }
  });
}

async function mountSvgInPage(
  page: Page,
  svg: string,
  whiteBackground: boolean,
): Promise<void> {
  const { width, height } = parseSvgDimensions(svg);

  await isolatePageForRasterize(page);

  await page.evaluate(
    ({ hostId, svgContent, whiteBackground, width, height }) => {
      const existing = document.getElementById(hostId);
      existing?.remove();

      const host = document.createElement("div");
      host.id = hostId;
      host.style.cssText = [
        "position:fixed",
        "left:0",
        "top:0",
        "margin:0",
        "padding:0",
        "overflow:hidden",
        "line-height:0",
        "z-index:2147483647",
        "isolation:isolate",
        `width:${width}px`,
        `height:${height}px`,
        whiteBackground ? "background:#ffffff" : "background:transparent",
      ].join(";");

      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, "image/svg+xml");
      const root = doc.documentElement;
      if (root.querySelector("parsererror")) {
        throw new Error("Invalid SVG for in-page rasterization");
      }

      if (root.id === "canvas") {
        root.id = "rmp-export-canvas";
      }

      const imported = document.importNode(root, true);
      host.appendChild(imported);
      document.body.appendChild(host);
    },
    {
      hostId: RASTER_HOST_ID,
      svgContent: svg,
      whiteBackground,
      width,
      height,
    },
  );

  await page.waitForFunction(() => document.fonts.ready, undefined, {
    timeout: 120_000,
  });
}

async function unmountSvgFromPage(page: Page): Promise<void> {
  await page.evaluate((hostId) => {
    document.getElementById(hostId)?.remove();
    const root = document.getElementById("root");
    if (root) {
      root.style.removeProperty("visibility");
    }
  }, RASTER_HOST_ID);
}

export async function rasterizeSvgInPage(
  options: PlaywrightRasterizeOptions,
): Promise<void> {
  const svg = readFileSync(options.svgPath, "utf-8");
  mkdirSync(dirname(options.outputPath), { recursive: true });

  try {
    await mountSvgInPage(options.page, svg, options.whiteBackground);

    const png = await options.page.locator(`#${RASTER_HOST_ID}`).screenshot({
      type: "png",
      omitBackground: !options.whiteBackground,
    });

    const format = rasterFormatFromPath(options.outputPath);
    if (format === "png") {
      writeFileSync(options.outputPath, png);
    } else {
      await sharp(png).webp().toFile(options.outputPath);
    }
  } finally {
    await unmountSvgFromPage(options.page);
  }
}
