import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import type { CropRect, WatermarkAnchor, WatermarkConfig } from "../config.js";
import { resvgBaseOptions } from "../resvg-fonts.js";

/** Inkscape-measured #rmp_info size (rmp-6.0.22). */
const RMP_INFO_FALLBACK_SIZE = { width: 348.809, height: 52.115 };

const RMP_INFO_RE =
  /(<g\b[^>]*\btransform=")translate\([^"]*\)("[^>]*\bid="rmp_info"[^>]*>)/;

const RMP_INFO_TRANSLATE_RE =
  /\btransform="translate\(([^)]+)\)"[^>]*\bid="rmp_info"|\bid="rmp_info"[^>]*\btransform="translate\(([^)]+)\)"/;

const RMP_INFO_OPEN_RE = /<g\b[^>]*\bid="rmp_info"[^>]*>/;

interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WatermarkGeometry {
  size: { width: number; height: number };
  localOffset: { x: number; y: number };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseTranslatePair(raw: string): { x: number; y: number } | null {
  const [x, y] = raw.split(/[\s,]+/).map(Number);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return { x, y };
}

export function parseRmpInfoTranslate(
  svg: string,
): { x: number; y: number } | null {
  const match = svg.match(RMP_INFO_TRANSLATE_RE);
  if (!match) return null;
  return parseTranslatePair(match[1] ?? match[2] ?? "");
}

function extractRmpInfoElement(svg: string): string | null {
  const openMatch = RMP_INFO_OPEN_RE.exec(svg);
  if (!openMatch) return null;

  const start = openMatch.index;
  let depth = 1;
  let i = start + openMatch[0].length;

  while (i < svg.length && depth > 0) {
    const nextOpen = svg.indexOf("<g", i);
    const nextClose = svg.indexOf("</g>", i);
    if (nextClose === -1) return null;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 2;
    } else {
      depth -= 1;
      i = nextClose + 4;
    }
  }

  if (depth !== 0) return null;
  return svg.slice(start, i);
}

function isValidBBox(bbox: BBox): boolean {
  return (
    bbox.width > 0 &&
    bbox.height > 0 &&
    [bbox.x, bbox.y, bbox.width, bbox.height].every(Number.isFinite)
  );
}

/** Measure #rmp_info bbox via resvg getBBox on an isolated mini-SVG. */
export function measureRmpInfoBBox(svg: string): BBox | null {
  const element = extractRmpInfoElement(svg);
  if (!element) return null;

  const mini = `<svg xmlns="http://www.w3.org/2000/svg">${element}</svg>`;
  try {
    const raw = new Resvg(mini, resvgBaseOptions()).getBBox();
    if (!raw) return null;
    const bbox = { x: raw.x, y: raw.y, width: raw.width, height: raw.height };
    return isValidBBox(bbox) ? bbox : null;
  } catch {
    return null;
  }
}

export function measureRmpInfoGeometry(svg: string): WatermarkGeometry {
  const translate = parseRmpInfoTranslate(svg);
  const bbox = measureRmpInfoBBox(svg);

  if (bbox && translate) {
    return {
      size: { width: bbox.width, height: bbox.height },
      localOffset: {
        x: bbox.x - translate.x,
        y: bbox.y - translate.y,
      },
    };
  }

  return {
    size: { ...RMP_INFO_FALLBACK_SIZE },
    localOffset: { x: 0, y: 0 },
  };
}

function bboxFromTranslate(
  translate: { x: number; y: number },
  geometry: WatermarkGeometry,
): BBox {
  return {
    x: translate.x + geometry.localOffset.x,
    y: translate.y + geometry.localOffset.y,
    width: geometry.size.width,
    height: geometry.size.height,
  };
}

function computeTargetBBox(
  frame: CropRect,
  anchor: WatermarkAnchor,
  inset: { x: number; y: number },
  geometry: WatermarkGeometry,
): BBox {
  const { width, height } = geometry.size;

  switch (anchor) {
    case "bottom-right":
      return {
        x: frame.x + frame.width - inset.x - width,
        y: frame.y + frame.height - inset.y - height,
        width,
        height,
      };
    case "bottom-left":
      return {
        x: frame.x + inset.x,
        y: frame.y + frame.height - inset.y - height,
        width,
        height,
      };
    case "top-right":
      return {
        x: frame.x + frame.width - inset.x - width,
        y: frame.y + inset.y,
        width,
        height,
      };
    case "top-left":
      return {
        x: frame.x + inset.x,
        y: frame.y + inset.y,
        width,
        height,
      };
    default:
      throw new Error(`Unknown watermark anchor: ${anchor}`);
  }
}

function computeTranslateFromInset(
  frame: CropRect,
  config: WatermarkConfig,
  geometry: WatermarkGeometry,
): { x: number; y: number } {
  if (config.absolute) {
    return config.absolute;
  }

  const { anchor, inset } = config;
  if (!anchor || !inset) {
    throw new Error("watermark requires absolute or anchor+inset");
  }

  const target = computeTargetBBox(frame, anchor, inset, geometry);
  return {
    x: target.x - geometry.localOffset.x,
    y: target.y - geometry.localOffset.y,
  };
}

function isRectInFrame(bbox: BBox, frame: CropRect): boolean {
  return (
    bbox.x >= frame.x &&
    bbox.y >= frame.y &&
    bbox.x + bbox.width <= frame.x + frame.width &&
    bbox.y + bbox.height <= frame.y + frame.height
  );
}

function clampRectToFrame(bbox: BBox, frame: CropRect): BBox {
  return {
    x: clamp(bbox.x, frame.x, frame.x + frame.width - bbox.width),
    y: clamp(bbox.y, frame.y, frame.y + frame.height - bbox.height),
    width: bbox.width,
    height: bbox.height,
  };
}

function writeRmpInfoTranslate(
  svgPath: string,
  svg: string,
  translate: { x: number; y: number },
): boolean {
  if (!RMP_INFO_RE.test(svg)) return false;
  writeFileSync(
    svgPath,
    svg.replace(RMP_INFO_RE, `$1translate(${translate.x}, ${translate.y})$2`),
    "utf-8",
  );
  return true;
}

export function applyWatermark(
  svgPath: string,
  frame: CropRect,
  config: WatermarkConfig,
  geometry: WatermarkGeometry,
): void {
  const { x, y } = computeTranslateFromInset(frame, config, geometry);
  let svg = readFileSync(svgPath, "utf-8");

  if (!RMP_INFO_RE.test(svg)) {
    console.warn("watermark: #rmp_info not found, skipping");
    return;
  }

  svg = svg.replace(RMP_INFO_RE, `$1translate(${x}, ${y})$2`);
  writeFileSync(svgPath, svg, "utf-8");
}

export function ensureWatermarkInFrame(
  svgPath: string,
  frame: CropRect,
  geometry: WatermarkGeometry,
): void {
  const svg = readFileSync(svgPath, "utf-8");
  if (!/id="rmp_info"/.test(svg)) {
    return;
  }

  const translate = parseRmpInfoTranslate(svg);
  if (!translate) {
    console.warn("watermark ensure: #rmp_info found but translate missing, skipping");
    return;
  }

  const bbox = bboxFromTranslate(translate, geometry);

  if (isRectInFrame(bbox, frame)) {
    return;
  }

  if (frame.width < bbox.width || frame.height < bbox.height) {
    console.warn(
      `watermark ensure: frame (${frame.width}x${frame.height}) smaller than watermark (${bbox.width}x${bbox.height}), leaving position unchanged`,
    );
    return;
  }

  const clamped = clampRectToFrame(bbox, frame);
  const deltaX = clamped.x - bbox.x;
  const deltaY = clamped.y - bbox.y;
  if (deltaX === 0 && deltaY === 0) {
    return;
  }

  const nextTranslate = {
    x: translate.x + deltaX,
    y: translate.y + deltaY,
  };

  if (!writeRmpInfoTranslate(svgPath, svg, nextTranslate)) {
    console.warn("watermark ensure: #rmp_info translate pattern not matched, skipping");
    return;
  }

  console.warn(
    `watermark ensure: repositioned (${translate.x}, ${translate.y}) -> (${nextTranslate.x}, ${nextTranslate.y}) to fit viewBox`,
  );
}
