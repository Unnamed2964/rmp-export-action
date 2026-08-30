export interface PlaywrightExportOptions {
    baseUrl: string;
    jsonPath: string;
    outputPath: string;
    debugDir: string;
}
export declare function exportSvgViaPlaywright(options: PlaywrightExportOptions): Promise<void>;
