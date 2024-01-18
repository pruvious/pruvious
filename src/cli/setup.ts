import { defineCommand } from 'citty'
import { cyan, underline } from 'colorette'
import { consola } from 'consola'
import fs from 'fs-extra'
import { writeFile } from 'magicast'
import { nanoid } from 'nanoid'
import path, { basename } from 'path'
import { getNuxtConfig, getProjectInfo } from './project.js'
import { joinRouteParts, sortArgs } from './shared.js'

export default defineCommand({
  meta: {
    name: 'setup',
    description: 'Set up Pruvious in a Nuxt project',
  },
  args: sortArgs({
    all: {
      type: 'boolean',
      description: 'Make all optimizations without prompting',
    },
    dev: {
      type: 'boolean',
      description: `Replace ${underline('dev')} script in ${underline('package.json')}`,
    },
    gitignore: {
      type: 'boolean',
      description: `Update ${underline('.gitignore')}`,
    },
    module: {
      type: 'boolean',
      description: `Add pruvious to ${underline('nuxt.config.ts')}`,
    },
    pages: {
      type: 'boolean',
      description: `Replace ${underline('app.vue')}`,
    },
    layout: {
      type: 'boolean',
      description: `Add ${underline('layouts/default.vue')}`,
    },
  }),
  async run({ args }) {
    const ops = {
      dev: args.dev ?? args.all ?? null,
      gitignore: args.gitignore ?? args.all ?? null,
      module: args.module ?? args.all ?? null,
      pages: args.pages ?? args.all ?? null,
      layout: args.layout ?? args.all ?? null,
    }

    if (Object.values(ops).every((op) => op === null)) {
      const answers: any[] = await consola.prompt(
        `Choose optimizations to apply (press ${cyan('<space>')} to select):`,
        {
          type: 'multiselect',
          options: [
            { label: 'Add pruvious to nuxt.config.ts', value: 'module' },
            { label: 'Add default layout if missing', value: 'layout', hint: 'layouts/default.vue' },
            { label: 'Replace app.vue', value: 'pages', hint: 'with <NuxtPage />' },
            { label: 'Replace dev script in package.json', value: 'dev', hint: 'with pruvious dev' },
            { label: 'Update .gitignore', value: 'gitignore' },
          ],
        },
      )

      if (typeof answers === 'symbol') {
        process.exit(0)
      }

      for (const answer of answers) {
        ops[answer as keyof typeof ops] = true
      }
    }

    if (ops.module) {
      await addPruviousModuleToNuxtConfig()
    }

    if (ops.pages) {
      replaceAppVue()
    }

    if (ops.dev) {
      replacePackageJsonDevScript()
    }

    if (ops.gitignore) {
      await patchGitignore()
    }

    if (ops.layout) {
      addDefaultLayout()
    }

    consola.success('Done!')
  },
})

export async function addPruviousModuleToNuxtConfig(cwd?: string) {
  const { config, module } = await getNuxtConfig(cwd)

  if (config) {
    if (!config.modules) {
      config.modules = []
    }

    if (!config.modules.includes('pruvious')) {
      config.modules.push('pruvious')
      config.pruvious = { jwt: { secretKey: nanoid(64) } }
    }

    await writeFile(module as any, path.resolve(cwd ?? process.cwd(), 'nuxt.config.ts'))
  }
}

export function replaceAppVue(cwd?: string) {
  const appVuePath = path.resolve(cwd ?? process.cwd(), 'app.vue')

  if (fs.existsSync(appVuePath)) {
    fs.writeFileSync(appVuePath, ['<template>', '  <NuxtPage />', '</template>', ''].join('\n'))
  }
}

export function replacePackageJsonDevScript(cwd?: string) {
  const packageJsonPath = path.resolve(cwd ?? process.cwd(), 'package.json')

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readJSONSync(packageJsonPath)

    if (!packageJson.scripts) {
      packageJson.scripts = {}
    }

    packageJson.scripts.dev = 'pruvious dev'

    fs.writeJSONSync(packageJsonPath, packageJson, { spaces: 2 })
  }
}

export async function patchGitignore(cwd?: string) {
  const gitignorePath = path.resolve(cwd ?? process.cwd(), '.gitignore')

  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8').trim().split('\n')
    const { driveType, uploadsPath, uploadsUrlPrefix, database } = await getProjectInfo(cwd)
    const newRules = ['.autoload.sql', '.pruvious', '.ssh.*'].sort()

    if (driveType === 'local') {
      newRules.push(uploadsPath.replace(/^\.\//, '/'), joinRouteParts('public', uploadsUrlPrefix ?? 'uploads'))
    }

    newRules.sort()

    if (database.startsWith('sqlite:')) {
      newRules.push(basename(database), basename(database) + '-journal')
    }

    let changed = false

    if (!gitignore.includes('# Pruvious dev/build outputs')) {
      gitignore.push('', '# Pruvious dev/build outputs')
    }

    for (const rule of newRules) {
      if (!gitignore.includes(rule)) {
        gitignore.push(rule)
        changed = true
      }
    }

    if (changed) {
      gitignore.push('')
      fs.writeFileSync(gitignorePath, gitignore.join('\n'))
    }
  }
}

export function addDefaultLayout(cwd?: string) {
  const layoutsPath = path.resolve(cwd ?? process.cwd(), 'layouts')
  const defaultLayoutPath = path.resolve(layoutsPath, 'default.vue')

  if (!fs.existsSync(layoutsPath)) {
    fs.mkdirSync(layoutsPath)
  }

  if (!fs.existsSync(defaultLayoutPath)) {
    fs.writeFileSync(defaultLayoutPath, [`<template>`, `  <slot />`, `</template>`, ``].join('\n'))
  }
}
