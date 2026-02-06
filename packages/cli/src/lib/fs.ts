// File system helpers using attemptAsync for all operations
import { readFile, writeFile, mkdir, access, chmod } from "node:fs/promises";
import { attemptAsync } from "es-toolkit";

export async function readFileAsync(path: string): Promise<[Error | null, string | null]> {
  return attemptAsync(async () => {
    return await readFile(path, "utf8");
  });
}

export async function writeFileAsync(
  path: string,
  content: string,
): Promise<[Error | null, void | null]> {
  return attemptAsync(async () => {
    await writeFile(path, content, "utf8");
  });
}

export async function mkdirAsync(path: string): Promise<[Error | null, void | null]> {
  return attemptAsync(async () => {
    await mkdir(path, { recursive: true });
  });
}

export async function fileExists(path: string): Promise<boolean> {
  const [error] = await attemptAsync(async () => {
    await access(path);
  });
  return error === null;
}

export async function chmodAsync(path: string, mode: number): Promise<[Error | null, void | null]> {
  return attemptAsync(async () => {
    await chmod(path, mode);
  });
}
