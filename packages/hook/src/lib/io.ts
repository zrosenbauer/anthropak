export { PLUGIN_ROOT, PROJECT_DIR, INSTALLED_PLUGINS_PATH } from "./constants.js";

/**
 * Reads and parses JSON data from stdin.
 */
export function readStdin(): Promise<unknown> {
  return new Promise(function (resolve, reject) {
    let data = "";
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", function (chunk: string) {
      data += chunk;
    });

    process.stdin.on("end", function () {
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });

    process.stdin.on("error", reject);
  });
}
