import { execFile } from "node:child_process";
import { attemptAsync } from "es-toolkit";

/**
 * Returns the appropriate command and args for detecting tool existence
 * Uses 'where' on Windows, 'which' on Unix-like systems
 */
export function getDetectionCommand(toolName: string): { command: string; args: string[] } {
  return process.platform === "win32"
    ? { command: "where", args: [toolName] }
    : { command: "which", args: [toolName] };
}

/**
 * Checks if a CLI tool exists on the system
 * Returns false on timeout or detection failure
 */
export async function checkToolExists(toolName: string): Promise<boolean> {
  const [error, result] = await attemptAsync(async () => {
    const { command, args } = getDetectionCommand(toolName);

    return await new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("timeout"));
      }, 3000);

      execFile(command, args, (err) => {
        clearTimeout(timeout);
        resolve(!err);
      });
    });
  });

  return error ? false : result!;
}
