#!/usr/bin/env node
import { setCurrentWorkingDirectory } from '@pruvious/cli-utils'
import { defineCommand, runMain } from 'citty'
import packageJSON from '../package.json' with { type: 'json' }
import { commands } from './commands'
import { sharedArgs } from './utils/args'
import { setConfigPath } from './utils/config'
import { setupGlobalConsole } from './utils/console'
import { checkEngines } from './utils/engines'

const main = defineCommand({
  meta: {
    name: '@pruvious/hub',
    version: packageJSON.version,
    description: packageJSON.description,
  },
  args: {
    ...sharedArgs,
    command: {
      type: 'positional',
      required: false,
    },
  },
  subCommands: commands,
  async setup(ctx) {
    setCurrentWorkingDirectory(ctx.args.cwd)
    setConfigPath(ctx.args.config)
    setupGlobalConsole()
    checkEngines()
  },
})

await runMain(main)
