import * as p from '@clack/prompts'
import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { CommandModule } from 'yargs'
import { getHookScript } from '../lib/templates.js'
import { readHooksJson, hookExists, addHookEntry, writeHooksJson } from '../lib/hooks.js'

interface UpdateArgs {
  path: string
}

const command: CommandModule<object, UpdateArgs> = {
  command: 'update [path]',
  describe: 'Update hook script and hooks.json to latest version',
  builder: (yargs) =>
    yargs.positional('path', {
      describe: 'Plugin root directory',
      default: '.',
      type: 'string'
    }),
  handler: (argv) => {
    const root = resolve(argv.path)
    const hooksDir = join(root, 'hook')
    const hookScript = join(hooksDir, 'anthropak.mjs')
    const hooksJsonPath = join(root, 'hooks.json')

    p.intro('Updating anthropak')

    if (!existsSync(hooksDir)) {
      mkdirSync(hooksDir, { recursive: true })
      p.log.success('Created hook/ directory')
    }

    const content = getHookScript()
    writeFileSync(hookScript, content)
    chmodSync(hookScript, 0o755)
    p.log.success('Updated hook/anthropak.mjs')

    const existingHooks = readHooksJson(hooksJsonPath)
    if (hookExists(existingHooks)) {
      p.log.info('hooks.json already up to date')
    } else {
      const updatedHooks = addHookEntry(existingHooks)
      writeHooksJson(hooksJsonPath, updatedHooks)
      p.log.success('Updated hooks.json')
    }

    p.outro('Done')
  }
}

export default command
