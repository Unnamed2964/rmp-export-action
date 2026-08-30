import { readFileSync, writeFileSync } from "node:fs";
import type { CropRect } from "../config.js";

export function parseViewBox(svg: string): CropRect | null {
  const match = svg.match(/<svg\b[^>]*\bviewBox="([^"]+)"/);
  if (!match) return null;
  const [x, y, width, height] = match[1].split(/\s+/).map(Number);
  if ([x, y, width, height].some((n) => Number.isNaN(n))) return null;
  return { x, y, width, height };
}

export function parseViewBoxFromFile(svgPath: string): CropRect | null {
  return parseViewBox(readFileSync(svgPath, "utf-8"));
}

/** Set root &lt;svg&gt; viewBox (and width/height) on an RMP-exported file — SVG-space crop, no geometry rewrite. */
export function applyCropToSvg(svgPath: string, crop: CropRect): void {
  let svg = readFileSync(svgPath, "utf-8");
  const before = parseViewBox(svg);
  const viewBox = `${crop.x} ${crop.y} ${crop.width} ${crop.height}`;

  if (/<svg\b[^>]*\bviewBox="[^"]*"/.test(svg)) {
    svg = svg.replace(
      /(<svg\b[^>]*\b)viewBox="[^"]*"/,
      `$1viewBox="${viewBox}"`,
    );
  } else {
    svg = svg.replace(/<svg\b/, `<svg viewBox="${viewBox}"`);
  }

  if (/<svg\b[^>]*\bwidth="[^"]*"/.test(svg)) {
    svg = svg.replace(
      /(<svg\b[^>]*\b)width="[^"]*"/,
      `$1width="${crop.width}"`,
    );
  }
  if (/<svg\b[^>]*\bheight="[^"]*"/.test(svg)) {
    svg = svg.replace(
      /(<svg\b[^>]*\b)height="[^"]*"/,
      `$1height="${crop.height}"`,
    );
  }

  writeFileSync(svgPath, svg, "utf-8");

  if (before) {
    console.log(
      `crop: viewBox ${before.x} ${before.y} ${before.width} ${before.height}`,
    );
    console.log(
      `crop:      → ${crop.x} ${crop.y} ${crop.width} ${crop.height}`,
    );
  }
}

/** @deprecated Use applyCropToSvg */
export const applyViewBox = applyCropToSvg;
