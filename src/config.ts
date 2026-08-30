import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  selector: string;
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
  placeholders: {
    version: string;
    datetime: string;
  };
  rmp: {
    repository: string;
    ref: string;
    port?: number;
  };
  defaults: {
    scale: number;
    whiteBackground: boolean;
    formats: string[];
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

  if (!config.exports?.length) {
    throw new Error("rmp-release.yml: exports must not be empty");
  }
  if (!config.rmp?.repository || !config.rmp?.ref) {
    throw new Error("rmp-release.yml: rmp.repository and rmp.ref are required");
  }

  return { config, repoRoot: resolve(absolute, "..") };
}

export function resolveRepoPath(repoRoot: string, relativePath: string): string {
  return resolve(repoRoot, relativePath);
}
