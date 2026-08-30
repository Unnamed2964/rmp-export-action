/** Resolve git/npm/npx to absolute paths on Linux; leave bare name on Windows. */
export declare function systemExecutable(name: string): string;
export declare function runHookCommand(command: string, cwd: string): void;
