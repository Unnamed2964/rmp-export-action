export type WatermarkAnchor = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export interface CropRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface WatermarkConfig {
    anchor?: WatermarkAnchor;
    inset?: {
        x: number;
        y: number;
    };
    absolute?: {
        x: number;
        y: number;
    };
}
export interface PostProcessHook {
    type: "command";
    run: string;
}
export interface RasterDefaults {
    scale?: number;
    whiteBackground?: boolean;
}
export interface ExportTarget {
    id: string;
    source: string;
    outputs: Record<string, string>;
    /** Playwright deviceScaleFactor for this export; overrides defaults. */
    scale?: number;
    /** WebP background for this export; overrides defaults. */
    whiteBackground?: boolean;
    postProcess?: {
        hooks?: PostProcessHook[];
    };
    crop?: CropRect;
    watermark?: WatermarkConfig;
    skip?: boolean;
}
export interface ReleaseConfig {
    /** Must match rmp.ref: you read export terms for this RMP version in the UI. */
    acceptRmpExportTermsForRef?: string;
    rmp: {
        repository: string;
        ref: string;
    };
    /** Optional fallbacks when an export omits scale or whiteBackground. */
    defaults?: RasterDefaults;
    exports: ExportTarget[];
}
export declare function resolveExportScale(target: ExportTarget, defaults?: RasterDefaults): number;
export declare function resolveExportWhiteBackground(target: ExportTarget, defaults?: RasterDefaults): boolean;
export declare function loadConfig(configPath: string): {
    config: ReleaseConfig;
    repoRoot: string;
};
export declare function resolveRepoPath(repoRoot: string, relativePath: string): string;
