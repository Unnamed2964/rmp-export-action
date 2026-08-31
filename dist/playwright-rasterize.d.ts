import type { Page } from "playwright";
export interface PlaywrightRasterizeOptions {
    page: Page;
    svgPath: string;
    outputPath: string;
    whiteBackground: boolean;
}
export declare function rasterizeSvgInPage(options: PlaywrightRasterizeOptions): Promise<void>;
