export declare function normalizeVersion(input: string): string;
export declare function formatDatetime(timeZone?: string): string;
export interface PlaceholderValues {
    version: string;
    datetime: string;
}
export declare function buildPlaceholderValues(versionArg: string): PlaceholderValues;
export declare function applyPlaceholders(content: string, values: PlaceholderValues): string;
export declare function prepareJsonWithPlaceholders(sourcePath: string, destPath: string, values: PlaceholderValues): void;
