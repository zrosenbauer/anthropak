// hooks.json manipulation with attemptAsync and ts-pattern
import { attemptAsync } from "es-toolkit";
import { match } from "ts-pattern";
import { readFileAsync, writeFileAsync } from "./fs.js";
import { HOOK_ENTRY } from "./templates.js";
import type { HooksJson } from "../types.js";

/**
 * Read and parse hooks.json, returning empty structure if not exists
 */
export async function readHooksJson(path: string): Promise<HooksJson> {
  const [error, content] = await readFileAsync(path);

  if (error !== null) {
    return {};
  }

  const [parseError, parsed] = await attemptAsync(async () => JSON.parse(content as string));

  return match(parseError)
    .with(null, () => parsed as HooksJson)
    .otherwise(() => ({}));
}

/**
 * Check if the hook entry already exists in SessionStart
 */
export function hookExists(hooksJson: HooksJson): boolean {
  const sessionStart = hooksJson.SessionStart ?? [];
  return sessionStart.some((hook) => hook.name === HOOK_ENTRY.name);
}

/**
 * Add the hook entry to SessionStart if not exists
 */
export function addHookEntry(hooksJson: HooksJson): HooksJson {
  return match(hookExists(hooksJson))
    .with(true, () => hooksJson)
    .with(false, () => {
      const sessionStart = hooksJson.SessionStart ?? [];
      return {
        ...hooksJson,
        SessionStart: [...sessionStart, HOOK_ENTRY],
      };
    })
    .exhaustive();
}

/**
 * Write hooks.json to disk
 */
export async function writeHooksJson(path: string, hooksJson: HooksJson): Promise<void> {
  const content = JSON.stringify(hooksJson, null, 2) + "\n";
  const [error] = await writeFileAsync(path, content);

  match(error)
    .with(null, () => {
      // Success - no action needed
    })
    .otherwise((err) => {
      throw err;
    });
}
