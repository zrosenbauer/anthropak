import { readFile, writeFile, mkdir, access, chmod } from "node:fs/promises";
import { attemptAsync } from "es-toolkit";

export default {
  /**
   * Reads a file as UTF-8 text.
   *
   * @param path - Absolute or relative path to the file
   * @returns A tuple of `[error, content]` where `error` is `null` on success
   */
  async readFile(path: string): Promise<[Error | null, string | null]> {
    return attemptAsync(async () => {
      return await readFile(path, "utf8");
    });
  },

  /**
   * Writes UTF-8 text to a file, creating or overwriting it.
   *
   * @param path - Absolute or relative path to the file
   * @param content - The string content to write
   * @returns A tuple of `[error, void]` where `error` is `null` on success
   */
  async writeFile(path: string, content: string): Promise<[Error | null, void | null]> {
    return attemptAsync(async () => {
      await writeFile(path, content, "utf8");
    });
  },

  /**
   * Creates a directory and any necessary parent directories.
   *
   * @param path - Absolute or relative path to the directory
   * @returns A tuple of `[error, void]` where `error` is `null` on success
   */
  async mkdir(path: string): Promise<[Error | null, void | null]> {
    return attemptAsync(async () => {
      await mkdir(path, { recursive: true });
    });
  },

  /**
   * Checks whether a file or directory exists at the given path.
   *
   * @param path - Absolute or relative path to check
   * @returns `true` if the path is accessible, `false` otherwise
   */
  async exists(path: string): Promise<boolean> {
    const [error] = await attemptAsync(async () => {
      await access(path);
    });
    return error === null;
  },

  /**
   * Sets file permissions using a numeric mode.
   *
   * @param path - Absolute or relative path to the file
   * @param mode - Octal permission mode (e.g. `0o755`)
   * @returns A tuple of `[error, void]` where `error` is `null` on success
   */
  async chmod(path: string, mode: number): Promise<[Error | null, void | null]> {
    return attemptAsync(async () => {
      await chmod(path, mode);
    });
  },
};
