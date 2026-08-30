export interface RasterizeOptions {
    svgPath: string;
    outputPath: string;
    scale: number;
    whiteBackground: boolean;
    format: "webp" | "png";
}
export declare function rasterizeSvg(options: RasterizeOptions): Promise<void>;
