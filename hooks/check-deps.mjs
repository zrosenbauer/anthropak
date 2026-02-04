#!/usr/bin/env node
/**
 * SessionStart hook that checks plugin dependencies.
 * Reads dependencies.yaml and verifies required plugins are installed.
 *
 * Copy this file to your plugin's hooks/ directory and update hooks.json.
 */

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || join(__dirname, '..')
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd()
const DEPS_FILE = join(PLUGIN_ROOT, 'dependencies.yaml')
const INSTALLED_PLUGINS_FILE = join(homedir(), '.claude', 'plugins', 'installed_plugins.json')

/** Read JSON from stdin (required by hook interface) */
const readStdin = () =>
  new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      data += chunk
    })
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data))
      } catch (err) {
        reject(err)
      }
    })
    process.stdin.on('error', reject)
  })

/** Simple YAML parser for dependencies.yaml (no external deps) */
const parseSimpleYaml = (content) => {
  const deps = { required: [], optional: [] }
  let currentSection = null
  let currentItem = null

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    if (trimmed === 'required:') {
      currentSection = 'required'
      continue
    }
    if (trimmed === 'optional:') {
      currentSection = 'optional'
      continue
    }
    if (trimmed === 'dependencies:') continue

    if (line.match(/^\s{2,4}- plugin:/)) {
      if (currentItem && currentSection) deps[currentSection].push(currentItem)
      currentItem = { plugin: trimmed.replace('- plugin:', '').trim().replace(/"/g, '') }
    } else if (currentItem && trimmed.startsWith('marketplace:')) {
      currentItem.marketplace = trimmed.replace('marketplace:', '').trim().replace(/"/g, '')
    } else if (currentItem && trimmed.startsWith('github:')) {
      currentItem.github = trimmed.replace('github:', '').trim().replace(/"/g, '')
    } else if (currentItem && trimmed.startsWith('description:')) {
      currentItem.description = trimmed.replace('description:', '').trim().replace(/"/g, '')
    } else if (currentItem && trimmed.startsWith('install:')) {
      currentItem.install = trimmed.replace('install:', '').trim().replace(/"/g, '')
    }
  }

  if (currentItem && currentSection) deps[currentSection].push(currentItem)
  return deps
}

/** Check if a plugin is installed for current project */
const isPluginInstalled = (installedPlugins, plugin, marketplace, projectDir) => {
  const plugins = installedPlugins.plugins || {}

  // If marketplace specified, check exact match
  if (marketplace) {
    const key = `${plugin}@${marketplace}`
    const installations = plugins[key] || []
    return installations.some(
      (inst) =>
        inst.scope === 'global' ||
        inst.projectPath === projectDir ||
        projectDir.startsWith(inst.projectPath)
    )
  }

  // No marketplace - check if plugin exists with any marketplace
  for (const key of Object.keys(plugins)) {
    if (key.startsWith(`${plugin}@`)) {
      const installations = plugins[key] || []
      const found = installations.some(
        (inst) =>
          inst.scope === 'global' ||
          inst.projectPath === projectDir ||
          projectDir.startsWith(inst.projectPath)
      )
      if (found) return true
    }
  }

  return false
}

/** Generate install command */
const getInstallCommand = (dep) => {
  if (dep.install) return dep.install
  if (dep.marketplace) return `claude plugin add ${dep.plugin} --marketplace ${dep.marketplace}`
  if (dep.github) return `claude plugin add --git git@github.com:${dep.github}.git`
  return `claude plugin add ${dep.plugin}`
}

// Main execution with top-level await
try {
  await readStdin()

  if (!existsSync(DEPS_FILE)) {
    console.log(JSON.stringify({}))
    process.exit(0)
  }

  let installedPlugins = { plugins: {} }
  if (existsSync(INSTALLED_PLUGINS_FILE)) {
    installedPlugins = JSON.parse(readFileSync(INSTALLED_PLUGINS_FILE, 'utf8'))
  }

  const deps = parseSimpleYaml(readFileSync(DEPS_FILE, 'utf8'))

  const missingRequired = deps.required.filter(
    (dep) => !isPluginInstalled(installedPlugins, dep.plugin, dep.marketplace, PROJECT_DIR)
  )

  const missingOptional = deps.optional.filter(
    (dep) => !isPluginInstalled(installedPlugins, dep.plugin, dep.marketplace, PROJECT_DIR)
  )

  const messages = []

  if (missingRequired.length > 0) {
    messages.push('**Missing Required Plugin Dependencies**')
    for (const dep of missingRequired) {
      const desc = dep.description || ''
      messages.push(`- **${dep.plugin}**${desc ? ` - ${desc}` : ''}`)
      messages.push(`  \`${getInstallCommand(dep)}\``)
    }
    messages.push('')
  }

  if (missingOptional.length > 0) {
    messages.push('**Missing Optional Plugin Dependencies**')
    for (const dep of missingOptional) {
      const desc = dep.description || ''
      messages.push(`- **${dep.plugin}**${desc ? ` - ${desc}` : ''}`)
      messages.push(`  \`${getInstallCommand(dep)}\``)
    }
  }

  console.log(JSON.stringify(messages.length > 0 ? { systemMessage: messages.join('\n') } : {}))
} catch {
  console.log(JSON.stringify({}))
}

process.exit(0)
