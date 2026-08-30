import type { CropRect, WatermarkConfig } from "../config.js";
interface BBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface WatermarkGeometry {
    size: {
        width: number;
        height: number;
    };
    localOffset: {
        x: number;
        y: number;
    };
}
export declare function parseRmpInfoTranslate(svg: string): {
    x: number;
    y: number;
} | null;
/** Measure #rmp_info bbox via resvg getBBox on an isolated mini-SVG. */
export declare function measureRmpInfoBBox(svg: string): BBox | null;
export declare function measureRmpInfoGeometry(svg: string): WatermarkGeometry;
export declare function applyWatermark(svgPath: string, frame: CropRect, config: WatermarkConfig, geometry: WatermarkGeometry): void;
export declare function ensureWatermarkInFrame(svgPath: string, frame: CropRect, geometry: WatermarkGeometry): void;
export {};
