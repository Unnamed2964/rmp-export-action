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
export interface ExportTarget {
    id: string;
    source: string;
    outputs: Record<string, string>;
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
    placeholders: {
        version: string;
        datetime: string;
    };
    rmp: {
        repository: string;
        ref: string;
    };
    defaults: {
        scale: number;
        whiteBackground: boolean;
    };
    exports: ExportTarget[];
}
export declare function loadConfig(configPath: string): {
    config: ReleaseConfig;
    repoRoot: string;
};
export declare function resolveRepoPath(repoRoot: string, relativePath: string): string;
