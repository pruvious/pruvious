#!/usr/bin/env node
import { cancel, confirm, intro, isCancel, log, outro, select, spinner, text } from '@clack/prompts'
import {
  checkEngines,
  colors,
  isValidPath,
  resolvePath,
  setCurrentWorkingDirectory,
  setupGlobalConsole,
  sharedArgs,
} from '@pruvious/cli-utils'
import { defineCommand, runMain } from 'citty'
import fs from 'node:fs'
import { basename, relative } from 'pathe'
import packageJSON from '../package.json' with { type: 'json' }
import { languageCodePattern, languageName, resolvePruviousSpec } from './lib/resolvers'
import { scaffoldProject } from './lib/scaffold'
import { templateDir } from './lib/index'
import { detectPackageManager, installCommand, runScriptCommand, type PackageManagerName } from './utils/pm'
import { toPackageName } from './utils/template'

const main = defineCommand({
  meta: {
    name: 'create-pruvious',
    version: packageJSON.version,
    description: packageJSON.description,
  },
  args: {
    ...sharedArgs,
    dir: {
      type: 'positional',
      description: 'The directory where the project will be created.',
      required: false,
      default: '',
    },
    pruvious: {
      type: 'string',
      description: 'Pruvious version to install (an npm dist-tag or version, a commit hash, or a full specifier).',
      valueHint: 'version',
      default: 'alpha',
    },
    pm: {
      type: 'string',
      description: 'Package manager to use (npm, pnpm).',
      valueHint: 'name',
      default: '',
    },
    lang: {
      type: 'string',
      description: 'Default language code for the site (BCP-47, e.g. en, de, de-AT).',
      valueHint: 'code',
      default: '',
    },
    install: {
      type: 'boolean',
      description: 'Install dependencies after scaffolding.',
      default: true,
    },
    git: {
      type: 'boolean',
      description: 'Initialize a git repository.',
      default: true,
    },
    force: {
      type: 'boolean',
      description: 'Overwrite the target directory if it already exists.',
      default: false,
    },
  },
  async setup(ctx) {
    setCurrentWorkingDirectory(resolvePath(ctx.args.cwd))
    setupGlobalConsole()
    await checkEngines()
  },
  async run(ctx) {
    intro(`${colors.bgCyan(colors.black(' Pruvious '))} Let's set up your new project.`)

    const targetDir = await resolveTargetDir(ctx.args.dir, ctx.args.force)
    const projectName = toPackageName(basename(targetDir))
    const pruviousSpec = await resolvePruviousSpec(ctx.args.pruvious)
    const packageManager = await resolvePackageManager(ctx.args.pm)
    const language = await resolveLanguage(ctx.args.lang)

    let install = ctx.args.install
    if (install && process.stdin.isTTY) {
      install = guard(await confirm({ message: 'Install dependencies now?', initialValue: true }))
    }

    let git = ctx.args.git
    if (git && process.stdin.isTTY) {
      git = guard(await confirm({ message: 'Initialize a git repository?', initialValue: true }))
    }

    const scaffoldSpinner = spinner()
    scaffoldSpinner.start('Scaffolding project')
    let activeSpinnerMessage = 'Scaffolding project'

    const result = await scaffoldProject(
      {
        targetDir,
        projectName,
        pruviousSpec,
        packageManager,
        language,
        install,
        git,
        force: ctx.args.force,
        templateDir,
      },
      {
        onLog: (line) => {
          activeSpinnerMessage = line
          scaffoldSpinner.message(line)
        },
      },
    )

    scaffoldSpinner.stop(activeSpinnerMessage)

    showNextSteps({
      targetDir: result.targetDir,
      packageManager: result.packageManager,
      install,
      installFailed: result.installFailed,
    })
    outro('Your Pruvious project is ready.')
  },
})

/**
 * Resolves and validates the target directory, prompting for it when missing
 * and handling the case where the directory already exists and is not empty.
 */
async function resolveTargetDir(input: string, force: boolean): Promise<string> {
  let dir = input

  while (true) {
    if (!dir) {
      if (!process.stdin.isTTY) {
        dir = './my-pruvious-app'
      } else {
        const answer = guard(
          await text({
            message: 'Where should we create your project?',
            placeholder: './my-pruvious-app',
            defaultValue: './my-pruvious-app',
            validate: (value) => {
              if (value && !isValidPath(value)) {
                return 'Invalid path'
              }
            },
          }),
        )

        dir = answer || './my-pruvious-app'
      }
    }

    const resolved = resolvePath(dir)

    if (fs.existsSync(resolved)) {
      const stat = fs.statSync(resolved)
      const isEmptyDirectory = stat.isDirectory() && fs.readdirSync(resolved).length === 0

      if (!isEmptyDirectory) {
        if (!force) {
          if (!process.stdin.isTTY) {
            cancel(`${colors.cyan(resolved)} already exists. Use --force to overwrite, or pass a different directory.`)
            process.exit(1)
          }

          const action = guard(
            await select({
              message: stat.isDirectory()
                ? `${colors.cyan(resolved)} already exists and is not empty. What would you like to do?`
                : `${colors.cyan(resolved)} already exists as a file. What would you like to do?`,
              options: [
                { value: 'overwrite', label: stat.isDirectory() ? 'Overwrite its contents' : 'Replace the file' },
                { value: 'different', label: 'Choose a different directory' },
                { value: 'abort', label: 'Abort' },
              ],
            }),
          )

          if (action === 'different') {
            dir = ''
            continue
          } else if (action === 'abort') {
            cancel('Operation cancelled.')
            process.exit(1)
          }
        }
      }
    }

    return resolved
  }
}

/**
 * Resolves the package manager from the explicit flag, an interactive prompt
 * (defaulting to the detected one), or plain auto-detection when running in a
 * non-interactive shell.
 */
async function resolvePackageManager(flag: string): Promise<PackageManagerName> {
  const supported: PackageManagerName[] = ['npm', 'pnpm']

  if (flag && supported.includes(flag as PackageManagerName)) {
    return flag as PackageManagerName
  }

  const detected = detectPackageManager()

  if (!process.stdin.isTTY) {
    return detected ?? 'npm'
  }

  return guard(
    await select({
      message: 'Which package manager do you want to use?',
      initialValue: detected ?? 'npm',
      options: supported.map((pm) => ({
        value: pm,
        label: pm,
        hint: detected && pm === detected ? 'detected' : undefined,
      })),
    }),
  )
}

/**
 * Resolves the site's default language as a `{ code, name }` pair from the
 * explicit flag or an interactive prompt (placeholder `en`). The display name is
 * derived from the code so the scaffolded `pruvious.i18n.languages` entry ships a
 * readable label.
 */
async function resolveLanguage(flag: string): Promise<{ code: string; name: string }> {
  if (flag && languageCodePattern.test(flag)) {
    return { code: flag, name: languageName(flag) }
  }

  if (!process.stdin.isTTY) {
    return { code: 'en', name: languageName('en') }
  }

  const code =
    guard(
      await text({
        message: 'What is the default language for your site?',
        placeholder: 'en',
        defaultValue: 'en',
        validate: (value) => {
          if (value && !languageCodePattern.test(value)) {
            return 'Use a BCP-47 code such as en, de, de-AT, or zh-Hant.'
          }
        },
      }),
    ) || 'en'

  return { code, name: languageName(code) }
}

/**
 * Prints the closing "Next steps" message with the commands the user should run.
 */
function showNextSteps(options: {
  targetDir: string
  packageManager: PackageManagerName
  install: boolean
  installFailed: boolean
}): void {
  const { targetDir, packageManager, install, installFailed } = options
  const cdTarget = relative(resolvePath('.'), targetDir)
  const steps: string[] = []

  if (cdTarget && cdTarget !== '.') {
    steps.push(`cd ${colors.cyan(cdTarget)}`)
  }

  if (!install || installFailed) {
    steps.push(colors.cyan(installCommand(packageManager)))
  }

  steps.push(colors.cyan(runScriptCommand(packageManager, 'dev')))

  log.message(
    [
      colors.bold('Next steps'),
      '',
      ...steps,
      '',
      `Then open ${colors.cyan('http://localhost:3000/dashboard')}`,
      'to create your first admin user.',
    ].join('\n'),
  )
}

/**
 * Exits gracefully when a prompt is cancelled, otherwise returns its value.
 */
function guard<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('Operation cancelled.')
    process.exit(1)
  }

  return value as T
}

await runMain(main)
