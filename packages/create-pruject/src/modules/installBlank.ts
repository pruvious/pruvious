import { loadingScreen, term, updateConfig } from '@pruject/dev'
import { Spawn } from '@pruvious/build'
import { randomString } from '@pruvious/utils'
import { spawnSync } from 'child_process'
import fs from 'fs-extra'
import path from 'path'
import { Stubs, copyStubs } from './copyStubs'
import { OtherPackages } from './resolveOtherPackages'
import { splashScreen } from './splashScreen'

export async function installBlank(
  dir: string,
  packages: OtherPackages,
  force: boolean,
  quiet: boolean,
) {
  let screen = await loadingScreen('Copying files ^-(1 of 3)^:')

  const stubs: Stubs = [
    '.gitignore',
    [
      'package.json',
      (content) => {
        return packages.prettier
          ? content
          : content
              .replace(',\n    "format": "prettier --write ."', '')
              .replace(/,\n    "prettier": "\^[0-9\.]+"/, '')
      },
    ],
    'README.md',
    [
      '.vscode/extensions.json',
      (content) => {
        if (!packages.prettier) {
          content = content.replace('    "esbenp.prettier-vscode",\n', '')
        }

        if (!packages.tailwind) {
          content = content.replace('    "bradlc.vscode-tailwindcss",\n', '')
        }

        return content
      },
    ],
    [
      '.vscode/settings.json',
      (content) => {
        if (!packages.tailwind) {
          content = content
            .replace('  "css.lint.unknownAtRules": "ignore",\n', '')
            .replace(',  "files.associations": {\n    "*.css": "tailwindcss"\n  }', '')
        }

        return content
      },
    ],
    'packages/nuxt/layouts/default.vue',
    'packages/nuxt/.gitignore',
    'packages/nuxt/app.vue',
    'packages/nuxt/error.vue',
    [
      'packages/nuxt/nuxt.config.ts',
      (content) => {
        if (!packages.pinia) {
          content = content.replace(
            "\n    ['@pinia/nuxt', { autoImports: ['defineStore', ['defineStore', 'definePiniaStore']] }],",
            '',
          )
        }

        if (!packages.tailwind) {
          content = content.replace(
            '\n  postcss: {\n    plugins: {\n      tailwindcss: {},\n      autoprefixer: {},\n    },\n  },',
            '',
          )
        }

        return content
      },
    ],
    [
      'packages/nuxt/package.json',
      (content) => {
        if (!packages.pinia) {
          content = content
            .replace(/\n    "@pinia\/nuxt": "\^[0-9\.]+",/, '')
            .replace(/,\n    "pinia": "\^[0-9\.]+"/, '')
        }

        if (!packages.tailwind) {
          content = content
            .replace(/\n    "autoprefixer": "\^[0-9\.]+",/, '')
            .replace(/,\n    "postcss": "\^[0-9\.]+",\n    "tailwindcss": "\^[0-9\.]+"/, '')
        }

        return content
      },
    ],
    'packages/nuxt/README.md',
    'packages/nuxt/tsconfig.json',
    'packages/pruvious/.gitignore',
    'packages/pruvious/package.json',
    'packages/pruvious/pruvious.config.ts',
    'packages/pruvious/README.md',
    'packages/pruvious/tsconfig.json',
  ]

  if (packages.prettier) {
    stubs.push('.prettierignore', 'prettier.config.cjs')
  }

  if (packages.tailwind) {
    stubs.push(
      'packages/nuxt/assets/css/base.css',
      'packages/nuxt/assets/css/main.css',
      'packages/nuxt/assets/css/tailwind.css',
      'packages/nuxt/tailwind.config.js',
    )
  }

  fs.ensureDirSync(path.resolve(dir, '.vscode'))
  fs.ensureDirSync(path.resolve(dir, 'packages/pruvious/actions'))
  fs.ensureDirSync(path.resolve(dir, 'packages/pruvious/blocks'))
  fs.ensureDirSync(path.resolve(dir, 'packages/pruvious/collections'))
  fs.ensureDirSync(path.resolve(dir, 'packages/pruvious/icons'))
  fs.ensureDirSync(path.resolve(dir, 'packages/pruvious/settings'))
  fs.ensureDirSync(path.resolve(dir, 'packages/pruvious/uploads'))
  fs.ensureDirSync(path.resolve(dir, 'packages/pruvious/validators'))
  copyStubs('blank', dir, stubs)

  updateConfig({ id: randomString(32) })

  screen.destroy()
  screen = await loadingScreen('Installing dependencies ^-(2 of 3)^:')

  await new Spawn({ command: 'npm install', cwd: dir }).run().expectOutput(/vulnerabilities/)

  screen.destroy()
  screen = await loadingScreen('Initializing git repository ^-(3 of 3)^:')

  try {
    spawnSync('git init', { shell: true, cwd: dir, stdio: 'pipe' })
    spawnSync('git add .', { shell: true, cwd: dir, stdio: 'pipe' })
    spawnSync('git commit -m "Init"', { shell: true, cwd: dir, stdio: 'pipe' })
  } catch (_) {}

  screen.destroy()

  await splashScreen('All done!', 'start the development servers')

  term.clear()

  const options: string[] = []

  if (force) {
    options.push('-f')
  }

  if (quiet) {
    options.push('-q')
  }

  new Spawn({
    command: 'npm run dev' + (options.length ? ' -- ' : '') + options.join(' '),
    cwd: dir,
    showOutput: true,
  }).run()
}
