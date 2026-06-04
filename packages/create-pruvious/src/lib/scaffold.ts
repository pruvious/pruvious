import { execa } from 'execa'
import fs from 'node:fs'
import { installDependencies } from 'nypm'
import type { PackageManagerName } from '../utils/pm'
import { copyTemplate, patchNuxtConfig, patchPackageJSON, writePnpmWorkspace } from '../utils/template'

const pnpmVersion = '11.4.0'

export interface ScaffoldOptions {
  /**
   * Absolute, pre-resolved target directory.
   */
  targetDir: string

  /**
   * Pre-resolved npm-valid project name (e.g. via `toPackageName`).
   */
  projectName: string

  /**
   * Pre-resolved Pruvious dependency specifier (full URL, `npm:...`, `file:...`,
   * pkg.pr.new URL, or an npm version). Dist-tag lookups must be done by the
   * caller (see `resolvePruviousSpec`).
   */
  pruviousSpec: string

  /**
   * Package manager to use for the install step and the `packageManager` pin in
   * `package.json` (for pnpm).
   */
  packageManager: PackageManagerName

  /**
   * Default site language (BCP-47 code + display name).
   */
  language: { code: string; name: string }

  /**
   * Install dependencies after scaffolding files.
   */
  install: boolean

  /**
   * Initialize a git repository in `targetDir`. Silently no-ops if `git` is
   * missing on the host.
   */
  git: boolean

  /**
   * Overwrite `targetDir` if it already exists. When `false`, the function
   * throws if the directory exists and is non-empty.
   */
  force: boolean

  /**
   * Absolute path to the `create-pruvious` template directory to copy from.
   */
  templateDir: string
}

export interface ScaffoldHooks {
  /**
   * Receives a single log line per call (no trailing newline). Used to stream
   * progress to a terminal spinner, an SSE stream, etc.
   */
  onLog?: (line: string) => void | Promise<void>
}

export interface ScaffoldResult {
  /**
   * The absolute target directory the project was scaffolded into.
   */
  targetDir: string

  /**
   * The package manager that was used (echoed from input).
   */
  packageManager: PackageManagerName

  /**
   * Whether the install step ran but failed. Distinct from "install was
   * skipped"; check `options.install` for that.
   */
  installFailed: boolean

  /**
   * Whether `git init` succeeded (only meaningful when `options.git` is true).
   */
  gitInitialized: boolean
}

/**
 * Scaffolds a new Pruvious project into `options.targetDir`. Pure orchestration:
 * no prompts, no stdout, no `process.exit`. All progress goes through
 * `hooks.onLog`. Throws if `targetDir` already exists and is not empty unless
 * `options.force` is set.
 */
export async function scaffoldProject(options: ScaffoldOptions, hooks: ScaffoldHooks = {}): Promise<ScaffoldResult> {
  const log = async (line: string): Promise<void> => {
    if (hooks.onLog) {
      await hooks.onLog(line)
    }
  }

  if (fs.existsSync(options.targetDir)) {
    const stat = fs.statSync(options.targetDir)
    const isEmptyDirectory = stat.isDirectory() && fs.readdirSync(options.targetDir).length === 0

    if (!isEmptyDirectory) {
      if (!options.force) {
        throw new Error(`Target directory already exists: ${options.targetDir}`)
      }

      fs.rmSync(options.targetDir, { recursive: true, force: true })
    }
  }

  await log('Scaffolding project files...')

  copyTemplate(options.templateDir, options.targetDir)
  patchPackageJSON(
    options.targetDir,
    options.projectName,
    options.pruviousSpec,
    options.packageManager === 'pnpm' ? `pnpm@${pnpmVersion}` : undefined,
  )
  patchNuxtConfig(options.targetDir, options.language)
  if (options.packageManager === 'pnpm') {
    writePnpmWorkspace(options.targetDir)
  }

  await log('Project files written.')

  let gitInitialized = false
  if (options.git) {
    await log('Initializing git repository...')
    try {
      await execa('git', ['init'], { cwd: options.targetDir })
      gitInitialized = true
      await log('Git repository initialized.')
    } catch (error: any) {
      await log(`Skipped git initialization: ${error?.message ?? 'git is not available'}`)
    }
  }

  let installFailed = false
  if (options.install) {
    await log(`Installing dependencies with ${options.packageManager}...`)
    try {
      await installDependencies({ cwd: options.targetDir, packageManager: options.packageManager, silent: true })
      await log('Dependencies installed.')
    } catch (error: any) {
      installFailed = true
      await log(`Could not install dependencies automatically: ${error?.message ?? 'unknown error'}`)
    }
  }

  return {
    targetDir: options.targetDir,
    packageManager: options.packageManager,
    installFailed,
    gitInitialized,
  }
}
