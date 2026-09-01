import type { Page } from "playwright";
export type RasterFormat = "webp" | "png";
export interface PlaywrightRasterizeOptions {
    page: Page;
    svgPath: string;
    outputPath: string;
    whiteBackground: boolean;
}
export declare function rasterFormatFromPath(outputPath: string): RasterFormat;
export declare function rasterizeSvgInPage(options: PlaywrightRasterizeOptions): Promise<void>;
