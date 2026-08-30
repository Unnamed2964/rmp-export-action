import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { systemExecutable } from "./exec-tool.js";
function spawnOptions(cwd) {
    return { cwd, stdio: "inherit", shell: false };
}
function runCommand(command, args, cwd) {
    const executable = systemExecutable(command);
    return new Promise((resolvePromise, reject) => {
        const child = spawn(executable, args, spawnOptions(cwd));
        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0)
                resolvePromise();
            else
                reject(new Error(`${command} exited with code ${code}`));
        });
    });
}
async function waitForHttp(url, timeoutMs = 120_000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        try {
            const response = await fetch(url);
            if (response.ok)
                return;
        }
        catch {
            // retry
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Timed out waiting for ${url}`);
}
function sanitizeRef(ref) {
    return ref.replace(/[^a-zA-Z0-9._-]+/g, "_");
}
function prepareDevAssets(cacheDir) {
    const infoSrc = join(cacheDir, "info.json");
    const infoDest = join(cacheDir, "public", "info.json");
    if (existsSync(infoSrc)) {
        copyFileSync(infoSrc, infoDest);
    }
}
function findAvailablePort(host) {
    return new Promise((resolve, reject) => {
        const probe = createServer();
        probe.listen(0, host, () => {
            const address = probe.address();
            const port = typeof address === "object" && address !== null ? address.port : 0;
            probe.close((error) => {
                if (error)
                    reject(error);
                else if (port > 0)
                    resolve(port);
                else
                    reject(new Error("Failed to find an available port"));
            });
        });
        probe.on("error", reject);
    });
}
export async function startRmpServer(options) {
    const host = options.host ?? "127.0.0.1";
    const port = await findAvailablePort(host);
    const cacheDir = join(options.cacheRoot, sanitizeRef(options.ref));
    if (!existsSync(cacheDir)) {
        await runCommand("git", [
            "clone",
            "--depth",
            "1",
            "--branch",
            options.ref,
            options.repository,
            cacheDir,
        ], options.cacheRoot);
    }
    if (!existsSync(join(cacheDir, "node_modules"))) {
        const installCmd = existsSync(join(cacheDir, "package-lock.json"))
            ? ["ci"]
            : ["install"];
        await runCommand("npm", installCmd, cacheDir);
    }
    prepareDevAssets(cacheDir);
    const npm = systemExecutable("npm");
    const dev = spawn(npm, ["run", "dev", "--", "--host", host, "--port", String(port), "--strictPort"], { ...spawnOptions(cacheDir), stdio: "ignore", detached: process.platform !== "win32" });
    const baseUrl = `http://${host}:${port}/rmp/`;
    await waitForHttp(baseUrl);
    return {
        baseUrl,
        stop: () => {
            if (!dev)
                return;
            if (process.platform === "win32") {
                spawn("taskkill", ["/pid", String(dev.pid), "/f", "/t"], {
                    stdio: "ignore",
                    shell: true,
                });
            }
            else {
                process.kill(-dev.pid, "SIGTERM");
            }
        },
    };
}
