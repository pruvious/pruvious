#!/usr/bin/env node

import { freePorts } from './modules/freePorts'
import { isPruject } from './modules/isPruject'
import { resolveArgs } from './modules/resolveArgs'
import { resolveCommand } from './modules/resolveCommand'
import { runBackup } from './modules/runBackup'
import { runDeploy } from './modules/runDeploy'
import { runGenerate } from './modules/runGenerate'
import { runIncreaseVersion } from './modules/runIncreaseVersion'
import { runMirror } from './modules/runMirror'
import { runNuxtBuild } from './modules/runNuxtBuild'
import { runNuxtDev } from './modules/runNuxtDev'
import { runPruviousBuild } from './modules/runPruviousBuild'
import { runPruviousDev } from './modules/runPruviousDev'
import { runUpdate } from './modules/runUpdate'
import { error, newLine, term } from './modules/terminal'

const args = resolveArgs(
  'npm run pruject',
  [
    {
      name: 'build',
      description: 'Build the Pruvious and Nuxt apps',
      aliases: ['b'],
    },
    {
      name: 'dev',
      description: 'Start the Pruvious and Nuxt development servers',
      aliases: ['d'],
    },
    {
      name: 'update',
      description: 'Update all Pruvious dependencies',
      aliases: ['u'],
    },
    {
      name: 'backup',
      description: '[c]reate, [r]estore, or [d]elete CMS backups',
      aliases: ['B'],
    },
    {
      name: 'generate',
      description: 'Create an [a]ction, [b]lock, [c]ollection, [s]ettings group, or [v]alidator',
      aliases: ['g'],
    },
    {
      name: 'deploy',
      description: 'Deploy the website to a remote server',
      aliases: ['D'],
    },
    {
      name: 'mirror',
      description: 'Mirror content between local and remote servers',
      aliases: ['m'],
    },
    {
      name: 'increase',
      description: 'Increase the project version',
      aliases: ['i'],
    },
  ],
  [
    {
      name: 'force',
      description: 'Skip all warning messages',
    },
    {
      name: 'quiet',
      description: 'Prevent automatic opening of browser tabs',
    },
  ],
)

async function start() {
  const force: boolean = !!args.options.force
  const quiet: boolean = !!args.options.quiet

  if (!isPruject(process.cwd())) {
    newLine()
    error('No project found. Run ^cnpm init pruject^ to create one.')
    newLine(2)
    process.exit()
  }

  if (!args.name) {
    await resolveCommand()
  }

  if (args.name === 'build') {
    await runPruviousBuild()
    await runNuxtBuild()
  } else if (args.name === 'dev') {
    await freePorts(force)
    await runPruviousDev(!quiet)
    await runNuxtDev()
  } else if (args.name === 'update') {
    await runUpdate()
    process.exit()
  } else if (args.name === 'generate') {
    await runGenerate(args.sub)
    process.exit()
  } else if (args.name === 'backup') {
    await runBackup(args.sub)
    process.exit()
  } else if (args.name === 'deploy') {
    await runDeploy(args.sub)
    process.exit()
  } else if (args.name === 'increase') {
    await runIncreaseVersion(args.sub)
    process.exit()
  } else if (args.name === 'mirror') {
    await runMirror(args.sub)
    process.exit()
  } else {
    error('Invalid command name.')
    newLine(2)
    term('Run ^cnpm run pruject help^ to see a list of all commands.')
    newLine(2)
  }
}

start()
