#!/usr/bin/env bun
/**
 * Generates the Homebrew formula with correct SHA256 checksums.
 * Run this after building binaries to update Formula/anthropak.rb.
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BIN_DIR = join(ROOT, 'packages', 'cli', 'bin')
const FORMULA_PATH = join(ROOT, 'Formula', 'anthropak.rb')

interface BinaryInfo {
  name: string
  placeholder: string
}

const BINARIES: BinaryInfo[] = [
  { name: 'anthropak-darwin-arm64', placeholder: 'PLACEHOLDER_DARWIN_ARM64_SHA256' },
  { name: 'anthropak-darwin-x64', placeholder: 'PLACEHOLDER_DARWIN_X64_SHA256' },
  { name: 'anthropak-linux-arm64', placeholder: 'PLACEHOLDER_LINUX_ARM64_SHA256' },
  { name: 'anthropak-linux-x64', placeholder: 'PLACEHOLDER_LINUX_X64_SHA256' }
]

function sha256(filePath: string): string {
  const content = readFileSync(filePath)
  return createHash('sha256').update(content).digest('hex')
}

function main(): void {
  console.log('Generating Homebrew formula with SHA256 checksums...\n')

  // Check that binaries exist
  const missingBinaries: string[] = []
  for (const binary of BINARIES) {
    const binaryPath = join(BIN_DIR, binary.name)
    if (!existsSync(binaryPath)) {
      missingBinaries.push(binary.name)
    }
  }

  if (missingBinaries.length > 0) {
    console.error('Error: Missing binaries:')
    for (const name of missingBinaries) {
      console.error(`  - ${name}`)
    }
    console.error('\nRun "pnpm build:bin" first.')
    process.exit(1)
  }

  // Read formula template
  let formula = readFileSync(FORMULA_PATH, 'utf8')

  // Calculate and replace SHA256 checksums
  for (const binary of BINARIES) {
    const binaryPath = join(BIN_DIR, binary.name)
    const hash = sha256(binaryPath)
    formula = formula.replace(binary.placeholder, hash)
    console.log(`${binary.name}: ${hash}`)
  }

  // Write updated formula
  writeFileSync(FORMULA_PATH, formula)
  console.log(`\nFormula updated: ${FORMULA_PATH}`)
}

main()
