import type { ReleaseConfig } from "./config.js";
export interface PipelineOptions {
    config: ReleaseConfig;
    repoRoot: string;
    version: string;
    exportId?: string;
    dryRun?: boolean;
}
export declare function runPipeline(options: PipelineOptions): Promise<void>;
