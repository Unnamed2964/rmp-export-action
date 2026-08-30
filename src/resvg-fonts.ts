import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ResvgRenderOptions } from "@resvg/resvg-js";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const FONTS_DIR = join(PACKAGE_ROOT, "fonts");

/** Font options for resvg: bundled Noto CJK + system fonts (Arial, etc.). */
export function resvgFontOptions(): NonNullable<ResvgRenderOptions["font"]> {
  const font: NonNullable<ResvgRenderOptions["font"]> = {
    loadSystemFonts: true,
    sansSerifFamily: "Noto Sans CJK SC",
  };
  if (existsSync(FONTS_DIR)) {
    font.fontDirs = [FONTS_DIR];
  }
  return font;
}

export function resvgBaseOptions(): Pick<
  ResvgRenderOptions,
  "font" | "languages"
> {
  return {
    font: resvgFontOptions(),
    languages: ["zh", "ko", "en"],
  };
}
