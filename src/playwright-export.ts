import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";

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

async function saveDebug(page: Page, debugDir: string, label: string): Promise<void> {
  mkdirSync(debugDir, { recursive: true });
  const stamp = Date.now();
  await page.screenshot({
    path: join(debugDir, `${label}-${stamp}.png`),
    fullPage: true,
  });
}

export async function openRmpSession(
  options: OpenRmpSessionOptions,
): Promise<RmpPlaywrightSession> {
  mkdirSync(options.debugDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    acceptDownloads: true,
    deviceScaleFactor: options.scale,
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();

  try {
    await page.goto(options.baseUrl, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForFunction(() => document.fonts.ready, undefined, {
      timeout: 120_000,
    });
  } catch (error) {
    await saveDebug(page, options.debugDir, "session-open-failure");
    const tracePath = join(options.debugDir, `trace-${Date.now()}.zip`);
    await context.tracing.stop({ path: tracePath });
    await browser.close();
    throw error;
  }

  return {
    browser,
    context,
    page,
    debugDir: options.debugDir,
    close: async () => {
      await context.tracing.stop().catch(() => undefined);
      await browser.close();
    },
  };
}

export async function importMapJson(page: Page, jsonPath: string): Promise<void> {
  const fileInput = page.getByTestId("file-upload");
  await fileInput.waitFor({ state: "attached", timeout: 120_000 });
  await fileInput.setInputFiles(jsonPath);
  await page
    .getByRole("button", { name: /Overwrite|清除当前并覆盖/i })
    .click();
  await page.locator("#canvas path").first().waitFor({ state: "attached", timeout: 120_000 });
}

export async function downloadSvgExport(
  page: Page,
  outputPath: string,
): Promise<void> {
  await page.locator("#menu-button-download").click();
  await page
    .getByRole("menuitem", { name: /Export image|导出图片/i })
    .click();

  await page
    .getByRole("group", { name: /Format|文件种类/i })
    .getByLabel(/Format|文件种类/i)
    .selectOption("svg");

  await page.locator("#agree_terms").check({ force: true });

  const shareInfo = page.locator("#share_info");
  if ((await shareInfo.count()) === 0) {
    console.log("export: #share_info not found, skipping embed option");
  } else if (!(await shareInfo.isEnabled())) {
    console.log("export: #share_info disabled, skipping embed option");
  } else {
    await shareInfo.uncheck({ force: true });
  }

  const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
  await page
    .getByRole("button", { name: /Download|下载/i })
    .click();
  const download = await downloadPromise;

  mkdirSync(dirname(outputPath), { recursive: true });
  await download.saveAs(outputPath);
}

export async function failRmpSession(
  session: RmpPlaywrightSession,
  label: string,
): Promise<void> {
  await saveDebug(session.page, session.debugDir, label);
  const tracePath = join(session.debugDir, `trace-${Date.now()}.zip`);
  await session.context.tracing.stop({ path: tracePath });
}
