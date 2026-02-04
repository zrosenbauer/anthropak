#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import defaultCmd from './commands/default.js'
import init from './commands/init.js'
import update from './commands/update.js'
import { checkNodeVersion } from './lib/node-version.js'
import { VERSION } from './.generated/index.js'

yargs(hideBin(process.argv))
  .scriptName('anthropak')
  .usage('$0 [command] [options]')
  .middleware(checkNodeVersion)
  .command(defaultCmd)
  .command(init)
  .command(update)
  .help()
  .alias('h', 'help')
  .version(VERSION)
  .alias('v', 'version')
  .strict()
  .parse()
