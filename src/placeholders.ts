import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function normalizeVersion(input: string): string {
  const trimmed = input.trim();
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

export function formatDatetime(timeZone = "Asia/Shanghai"): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return formatter.format(new Date()).replace(" ", "T");
}

export interface PlaceholderValues {
  version: string;
  datetime: string;
}

export function buildPlaceholderValues(versionArg: string): PlaceholderValues {
  return {
    version: normalizeVersion(versionArg),
    datetime: formatDatetime(),
  };
}

const TOKEN_MAP: Record<keyof PlaceholderValues, string> = {
  version: "%version%",
  datetime: "%datetime%",
};

export function applyPlaceholders(
  content: string,
  values: PlaceholderValues,
): string {
  let result = content;
  for (const [key, token] of Object.entries(TOKEN_MAP) as [
    keyof PlaceholderValues,
    string,
  ][]) {
    result = result.replaceAll(token, values[key]);
  }
  return result;
}

export function prepareJsonWithPlaceholders(
  sourcePath: string,
  destPath: string,
  values: PlaceholderValues,
): void {
  const raw = readFileSync(sourcePath, "utf-8");
  const replaced = applyPlaceholders(raw, values);
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, replaced, "utf-8");
}
