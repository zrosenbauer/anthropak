import type { HookResponse } from './types.js'
import { readStdin, PLUGIN_ROOT, PROJECT_DIR, INSTALLED_PLUGINS_PATH } from './lib/io.js'
import { loadConfig, validateConfig } from './lib/config.js'
import { loadInstalledPlugins, isPluginInstalled } from './lib/registry.js'
import { formatMissingDeps } from './lib/output.js'

;(async () => {
  try {
    await readStdin()

    const rawConfig = loadConfig(PLUGIN_ROOT)

    if (!rawConfig) {
      console.log(JSON.stringify({}))
      process.exit(0)
    }

    const validation = validateConfig(rawConfig)

    if (!validation.valid || !validation.data) {
      console.log(JSON.stringify({}))
      process.exit(0)
    }

    const deps = validation.data

    const installedPlugins = loadInstalledPlugins(INSTALLED_PLUGINS_PATH)

    const missingRequired = deps.required.filter((dep) => {
      return !isPluginInstalled(installedPlugins, dep.plugin, dep.marketplace, PROJECT_DIR)
    })

    const missingOptional = deps.optional.filter((dep) => {
      return !isPluginInstalled(installedPlugins, dep.plugin, dep.marketplace, PROJECT_DIR)
    })

    const messages: string[] = []

    if (missingRequired.length > 0) {
      messages.push(...formatMissingDeps(missingRequired, '**Missing Required Plugin Dependencies**'))
      messages.push('')
    }

    if (missingOptional.length > 0) {
      messages.push(...formatMissingDeps(missingOptional, '**Missing Optional Plugin Dependencies**'))
    }

    const response: HookResponse = messages.length > 0 ? { systemMessage: messages.join('\n') } : {}
    console.log(JSON.stringify(response))
  } catch {
    console.log(JSON.stringify({}))
  }

  process.exit(0)
})()
