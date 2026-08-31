import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parse } from "yaml";

export type WatermarkAnchor =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WatermarkConfig {
  anchor?: WatermarkAnchor;
  inset?: { x: number; y: number };
  absolute?: { x: number; y: number };
}

export interface PostProcessHook {
  type: "command";
  run: string;
}

export interface ExportTarget {
  id: string;
  source: string;
  outputs: Record<string, string>;
  postProcess?: { hooks?: PostProcessHook[] };
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
  defaults: {
    scale: number;
    whiteBackground: boolean;
  };
  exports: ExportTarget[];
}

export function loadConfig(configPath: string): {
  config: ReleaseConfig;
  repoRoot: string;
} {
  const absolute = resolve(configPath);
  const raw = readFileSync(absolute, "utf-8");
  const config = parse(raw) as ReleaseConfig;
  const label = basename(absolute);

  if (!config.exports?.length) {
    throw new Error(`${label}: exports must not be empty`);
  }
  if (!config.rmp?.repository || !config.rmp?.ref) {
    throw new Error(`${label}: rmp.repository and rmp.ref are required`);
  }
  if (!config.acceptRmpExportTermsForRef) {
    throw new Error(
      `${label}: acceptRmpExportTermsForRef is required. ` +
        "Read RMP export terms in the export dialog for your rmp.ref, then set " +
        "acceptRmpExportTermsForRef to the same value as rmp.ref.",
    );
  }
  if (config.acceptRmpExportTermsForRef !== config.rmp.ref) {
    throw new Error(
      `${label}: acceptRmpExportTermsForRef (${config.acceptRmpExportTermsForRef}) ` +
        `must match rmp.ref (${config.rmp.ref}). ` +
        "Re-read export terms in the UI for the new RMP version and update the config.",
    );
  }

  return { config, repoRoot: resolve(absolute, "..") };
}

export function resolveRepoPath(repoRoot: string, relativePath: string): string {
  return resolve(repoRoot, relativePath);
}
