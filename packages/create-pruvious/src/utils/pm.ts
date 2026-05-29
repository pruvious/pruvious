import process from 'node:process'

export type PackageManagerName = 'npm' | 'pnpm'

const supported: PackageManagerName[] = ['npm', 'pnpm']

/**
 * Detects which package manager invoked the CLI by reading the
 * `npm_config_user_agent` environment variable that `npm create` and
 * `pnpm create` both set.
 * Returns `null` when the invoking manager cannot be determined (for example
 * when the CLI is run directly via `node`).
 */
export function detectPackageManager(): PackageManagerName | null {
  const userAgent = process.env.npm_config_user_agent ?? ''
  const name = userAgent.split('/')[0]

  if ((supported as string[]).includes(name)) {
    return name as PackageManagerName
  }

  return null
}

/**
 * Returns the install command for a package manager (e.g. `pnpm install`).
 */
export function installCommand(pm: PackageManagerName): string {
  return `${pm} install`
}

/**
 * Returns the command that runs a package.json script for a package manager
 * (e.g. `npm run dev`, `pnpm dev`).
 */
export function runScriptCommand(pm: PackageManagerName, script: string): string {
  return pm === 'pnpm' ? `pnpm ${script}` : `npm run ${script}`
}
