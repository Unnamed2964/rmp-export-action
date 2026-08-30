import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
const UNIX_BIN_DIRS = ["/usr/bin", "/usr/local/bin", "/bin"];
/** Resolve git/npm/npx to absolute paths on Linux; leave bare name on Windows. */
export function systemExecutable(name) {
    if (name.includes("/") || name.includes("\\"))
        return name;
    if (process.platform !== "win32") {
        for (const dir of UNIX_BIN_DIRS) {
            const full = join(dir, name);
            if (existsSync(full))
                return full;
        }
    }
    return name;
}
export function runHookCommand(command, cwd) {
    const result = process.platform === "win32"
        ? spawnSync(command, { cwd, stdio: "inherit", shell: true })
        : spawnSync("/bin/bash", ["-c", command], { cwd, stdio: "inherit" });
    if (result.status !== 0) {
        throw new Error(`Hook failed: ${command}`);
    }
}
