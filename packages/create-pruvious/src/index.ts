#!/usr/bin/env node
import { cancel, confirm, intro, isCancel, note, outro, select, spinner, text } from '@clack/prompts'
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
import { execa } from 'execa'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { installDependencies } from 'nypm'
import { basename, relative } from 'pathe'
import packageJSON from '../package.json' with { type: 'json' }
import { detectPackageManager, installCommand, runScriptCommand, type PackageManagerName } from './utils/pm'
import { copyTemplate, patchPackageJSON, toPackageName } from './utils/template'

const pkgPrNewBase = 'https://pkg.pr.new/pruvious/pruvious/pruvious'
const templateDir = fileURLToPath(new URL('../template', import.meta.url))

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
      description: 'Package manager to use (npm, pnpm, yarn, bun).',
      valueHint: 'name',
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
    const pruviousSpec = resolvePruviousSpec(ctx.args.pruvious)
    const packageManager = await resolvePackageManager(ctx.args.pm)

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
    copyTemplate(templateDir, targetDir)
    patchPackageJSON(targetDir, projectName, pruviousSpec)
    scaffoldSpinner.stop('Project scaffolded.')

    if (git) {
      const gitSpinner = spinner()
      gitSpinner.start('Initializing git repository')
      try {
        await execa('git', ['init'], { cwd: targetDir })
        gitSpinner.stop('Git repository initialized.')
      } catch {
        gitSpinner.stop('Skipped git initialization (git is not available).')
      }
    }

    let installFailed = false
    if (install) {
      const installSpinner = spinner()
      installSpinner.start(`Installing dependencies with ${packageManager}`)
      try {
        await installDependencies({ cwd: targetDir, packageManager, silent: true })
        installSpinner.stop('Dependencies installed.')
      } catch {
        installFailed = true
        installSpinner.stop('Could not install dependencies automatically.')
      }
    }

    showNextSteps({ targetDir, packageManager, install, installFailed })
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

        fs.rmSync(resolved, { recursive: true, force: true })
      }
    }

    return resolved
  }
}

/**
 * Turns a Pruvious version argument into an installable dependency specifier.
 * Full URLs and `npm:`/`file:` specifiers pass through unchanged, a bare commit
 * hash installs the matching pkg.pr.new continuous build, and anything else is
 * treated as an npm dist-tag or version (e.g. `alpha`, `4.0.0-alpha.0`).
 *
 * The commit-hash test requires at least one digit so that all-letter hex words
 * (e.g. a `deadbeef` dist-tag) are still treated as npm specifiers.
 */
function resolvePruviousSpec(version: string): string {
  if (version.includes('://') || version.startsWith('npm:') || version.startsWith('file:')) {
    return version
  }

  if (/^(?=.*[0-9])[0-9a-f]{7,40}$/i.test(version)) {
    return `${pkgPrNewBase}@${version}`
  }

  return version
}

/**
 * Resolves the package manager from the explicit flag, an interactive prompt
 * (defaulting to the detected one), or plain auto-detection when running in a
 * non-interactive shell.
 */
async function resolvePackageManager(flag: string): Promise<PackageManagerName> {
  const supported: PackageManagerName[] = ['npm', 'pnpm', 'yarn', 'bun']

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
 * Prints the closing "Next steps" note with the commands the user should run.
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

  const content = [
    ...steps,
    '',
    `Then open ${colors.cyan('http://localhost:3000/dashboard')}`,
    'to create your first admin user.',
  ].join('\n')

  note(content, 'Next steps')
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
