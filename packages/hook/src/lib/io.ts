import { attemptAsync } from "es-toolkit";

/**
 * Reads stdin data from Claude Code hook invocation
 * Returns null on error (hook doesn't need stdin content for dependency checking)
 */
export async function readStdin(): Promise<unknown | null> {
  const [error, data] = await attemptAsync(async () => {
    return new Promise((resolve, reject) => {
      let buffer = "";
      process.stdin.setEncoding("utf8");

      process.stdin.on("data", (chunk: string) => {
        buffer += chunk;
      });

      process.stdin.on("end", () => {
        resolve(JSON.parse(buffer));
      });

      process.stdin.on("error", reject);
    });
  });

  if (error) {
    return null;
  }

  return data;
}
