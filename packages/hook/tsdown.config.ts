import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsdown'

const banner = readFileSync(new URL('./banner.js', import.meta.url), 'utf8')

export default defineConfig({
  entry: {
    'anthropak.mjs': 'src/index.ts'
  },
  format: ['esm'],
  clean: true,
  shims: true,
  noExternal: ['confbox'],
  outputOptions: {
    banner,
    entryFileNames: '[name]'
  }
})
