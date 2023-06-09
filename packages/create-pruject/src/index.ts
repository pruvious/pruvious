#!/usr/bin/env node

import { error, newLine, resolveArgs } from '@pruject/dev'
import fs from 'fs-extra'
import { installBlank } from './modules/installBlank'
import { resolveDir } from './modules/resolveDir'
import { resolveOtherPackages } from './modules/resolveOtherPackages'
import { splashScreen } from './modules/splashScreen'

const args = resolveArgs(
  'npm init pruject',
  [],
  [
    {
      name: 'dir',
      description: 'Specify the directory name in which the project should be installed',
    },
    {
      name: 'tailwind',
      description: 'Install and configure Tailwind CSS in the Nuxt app',
    },
    {
      name: 'prettier',
      description: 'Install and configure Prettier in the project',
    },
    {
      name: 'pinia',
      description: 'Install and configure Pinia in the Nuxt app',
    },
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
  let dir: string | undefined = args.options.dir
  let pinia: boolean | undefined = args.options.pinia
  let prettier: boolean | undefined = args.options.prettier
  let tailwind: boolean | undefined = args.options.tailwind
  let force: boolean = !!args.options.force
  let quiet: boolean = !!args.options.quiet
  let cleared: boolean = false

  if (Object.keys(args.options).length === 0) {
    await splashScreen('Welcome to the Pruject installation process')
  }

  if (typeof dir !== 'string' || !dir.trim()) {
    dir = await resolveDir('empty')
    cleared = true
  } else if (fs.existsSync(dir) && fs.readdirSync(dir).length) {
    newLine()
    error('The target directory must be empty.')
    newLine(2)
    process.exit()
  }

  if (pinia === undefined || prettier === undefined || tailwind === undefined) {
    const packages = await resolveOtherPackages(
      {
        pinia: !!pinia || pinia === undefined,
        prettier: !!prettier || prettier === undefined,
        tailwind: !!tailwind || tailwind === undefined,
      },
      !cleared,
    )

    pinia = packages.pinia
    prettier = packages.prettier
    tailwind = packages.tailwind
    cleared = true
  }

  await installBlank(dir, { pinia: pinia!, prettier: prettier!, tailwind: tailwind! }, force, quiet)
}

start()
