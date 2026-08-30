import type { CropRect } from "../config.js";
export declare function parseViewBox(svg: string): CropRect | null;
export declare function parseViewBoxFromFile(svgPath: string): CropRect | null;
/** Set root &lt;svg&gt; viewBox (and width/height) on an RMP-exported file — SVG-space crop, no geometry rewrite. */
export declare function applyCropToSvg(svgPath: string, crop: CropRect): void;
/** @deprecated Use applyCropToSvg */
export declare const applyViewBox: typeof applyCropToSvg;
