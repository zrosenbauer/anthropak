import { attemptAsync } from "es-toolkit";
import type { HookStdinData } from "../types.js";

/**
 * Reads stdin data from Claude Code hook invocation
 * Returns null on error (hook doesn't need stdin content for dependency checking)
 */
export async function readStdin(): Promise<HookStdinData | null> {
  const [error, data] = await attemptAsync(async () => {
    return new Promise((resolve, reject) => {
      let buffer = "";
      process.stdin.setEncoding("utf8");

      process.stdin.on("data", (chunk: string) => {
        buffer += chunk;
      });

      process.stdin.on("end", () => {
        resolve(JSON.parse(buffer) as HookStdinData);
      });

      process.stdin.on("error", reject);
    });
  });

  if (error) {
    return null;
  }

  return data as HookStdinData;
}
