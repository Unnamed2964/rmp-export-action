import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface RmpServerOptions {
  repository: string;
  ref: string;
  cacheRoot: string;
  host?: string;
}

export interface RmpServerHandle {
  baseUrl: string;
  stop: () => void;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function waitForHttp(url: string, timeoutMs = 120_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function sanitizeRef(ref: string): string {
  return ref.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function prepareDevAssets(cacheDir: string): void {
  const infoSrc = join(cacheDir, "info.json");
  const infoDest = join(cacheDir, "public", "info.json");
  if (existsSync(infoSrc)) {
    copyFileSync(infoSrc, infoDest);
  }
}

function findAvailablePort(host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.listen(0, host, () => {
      const address = probe.address();
      const port =
        typeof address === "object" && address !== null ? address.port : 0;
      probe.close((error) => {
        if (error) reject(error);
        else if (port > 0) resolve(port);
        else reject(new Error("Failed to find an available port"));
      });
    });
    probe.on("error", reject);
  });
}

export async function startRmpServer(
  options: RmpServerOptions,
): Promise<RmpServerHandle> {
  const host = options.host ?? "127.0.0.1";
  const port = await findAvailablePort(host);
  const cacheDir = join(options.cacheRoot, sanitizeRef(options.ref));

  if (!existsSync(cacheDir)) {
    await runCommand(
      "git",
      [
        "clone",
        "--depth",
        "1",
        "--branch",
        options.ref,
        options.repository,
        cacheDir,
      ],
      options.cacheRoot,
    );
  }

  if (!existsSync(join(cacheDir, "node_modules"))) {
    const installCmd = existsSync(join(cacheDir, "package-lock.json"))
      ? ["ci"]
      : ["install"];
    await runCommand("npm", installCmd, cacheDir);
  }

  prepareDevAssets(cacheDir);

  const dev: ChildProcess | null = spawn(
    "npm",
    ["run", "dev", "--", "--host", host, "--port", String(port), "--strictPort"],
    {
      cwd: cacheDir,
      stdio: "ignore",
      shell: process.platform === "win32",
      detached: process.platform !== "win32",
    },
  );

  const baseUrl = `http://${host}:${port}/rmp/`;
  await waitForHttp(baseUrl);

  return {
    baseUrl,
    stop: () => {
      if (!dev) return;
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(dev.pid), "/f", "/t"], {
          stdio: "ignore",
          shell: true,
        });
      } else {
        process.kill(-dev.pid!, "SIGTERM");
      }
    },
  };
}
