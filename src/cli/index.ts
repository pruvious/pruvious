#!/usr/bin/env node

import { createResolver } from '@nuxt/kit'
import { defineCommand, runMain } from 'citty'
import fs from 'fs-extra'

const resolver = createResolver(import.meta.url)

const commands = {
  backup: () => import('./backup.js').then((r) => r.default),
  deploy: () => import('./deploy.js').then((r) => r.default),
  dev: () => import('./dev.js').then((r) => r.default),
  init: () => import('./init.js').then((r) => r.default),
  mirror: () => import('./mirror.js').then((r) => r.default),
  restore: () => import('./restore.js').then((r) => r.default),
  servers: () => import('./servers.js').then((r) => r.default),
  setup: () => import('./setup.js').then((r) => r.default),
  sites: () => import('./sites.js').then((r) => r.default),
} as const

const main = defineCommand({
  meta: {
    name: 'pruvious',
    version: fs.readJsonSync(resolver.resolve('../package.json')).version,
    description: 'Pruvious CLI',
  },
  subCommands: commands,
})

runMain(main)
