import { type Browser, type BrowserContext, type Page } from "playwright";
export interface OpenRmpSessionOptions {
    baseUrl: string;
    debugDir: string;
    scale: number;
}
export interface RmpPlaywrightSession {
    browser: Browser;
    context: BrowserContext;
    page: Page;
    debugDir: string;
    close(): Promise<void>;
}
export declare function openRmpSession(options: OpenRmpSessionOptions): Promise<RmpPlaywrightSession>;
export declare function importMapJson(page: Page, jsonPath: string): Promise<void>;
export declare function downloadSvgExport(page: Page, outputPath: string): Promise<void>;
export declare function failRmpSession(session: RmpPlaywrightSession, label: string): Promise<void>;
