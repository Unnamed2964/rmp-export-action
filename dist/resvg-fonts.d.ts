import type { ResvgRenderOptions } from "@resvg/resvg-js";
export declare const FONTS_DIR: string;
/** Font options for resvg: bundled Noto CJK + system fonts (Arial, etc.). */
export declare function resvgFontOptions(): NonNullable<ResvgRenderOptions["font"]>;
export declare function resvgBaseOptions(): Pick<ResvgRenderOptions, "font" | "languages">;
