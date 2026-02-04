import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { HOOK_ENTRY, type HookEntry } from './templates.js'

const HOOK_COMMAND = HOOK_ENTRY.command

/**
 * Structure of hooks.json file
 */
export interface HooksJson {
  hooks: {
    SessionStart?: HookEntry[]
    [key: string]: HookEntry[] | undefined
  }
}

/**
 * Read and parse hooks.json, returning empty structure if not exists
 */
export function readHooksJson(hooksPath: string): HooksJson {
  if (!existsSync(hooksPath)) {
    return { hooks: {} }
  }
  try {
    return JSON.parse(readFileSync(hooksPath, 'utf8')) as HooksJson
  } catch {
    return { hooks: {} }
  }
}

/**
 * Check if the hook entry already exists in SessionStart
 */
export function hookExists(hooksJson: HooksJson): boolean {
  const sessionStart = hooksJson.hooks?.SessionStart || []
  return sessionStart.some((hook) => hook.command === HOOK_COMMAND)
}

/**
 * Add the hook entry to SessionStart
 */
export function addHookEntry(hooksJson: HooksJson): HooksJson {
  if (!hooksJson.hooks) {
    hooksJson.hooks = {}
  }
  if (!hooksJson.hooks.SessionStart) {
    hooksJson.hooks.SessionStart = []
  }
  if (!hookExists(hooksJson)) {
    hooksJson.hooks.SessionStart.push({ ...HOOK_ENTRY })
  }
  return hooksJson
}

/**
 * Write hooks.json to disk
 */
export function writeHooksJson(hooksPath: string, hooksJson: HooksJson): void {
  writeFileSync(hooksPath, JSON.stringify(hooksJson, null, 2) + '\n')
}
