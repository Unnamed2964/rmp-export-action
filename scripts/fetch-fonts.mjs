#!/usr/bin/env node
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONTS_DIR = join(ROOT, "fonts");

const FILES = [
  {
    file: "NotoSansCJKsc-Regular.otf",
    url: "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf",
  },
  {
    file: "NotoSansCJKkr-Regular.otf",
    url: "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Korean/NotoSansCJKkr-Regular.otf",
  },
];

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download ${url}: ${res.status}`);
  }
  await pipeline(res.body, createWriteStream(dest));
}

async function main() {
  mkdirSync(FONTS_DIR, { recursive: true });
  for (const { file, url } of FILES) {
    const dest = join(FONTS_DIR, file);
    if (existsSync(dest)) {
      console.log(`fonts: ${file} already present`);
      continue;
    }
    console.log(`fonts: downloading ${file}…`);
    await download(url, dest);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
