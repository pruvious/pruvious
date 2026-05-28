import process from 'node:process'

export type PackageManagerName = 'npm' | 'pnpm' | 'yarn' | 'bun'

const supported: PackageManagerName[] = ['npm', 'pnpm', 'yarn', 'bun']

/**
 * Detects which package manager invoked the CLI by reading the
 * `npm_config_user_agent` environment variable that `npm create`,
 * `pnpm create`, `yarn create`, and `bun create` all set.
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
 * (e.g. `npm run dev`, `pnpm dev`, `yarn dev`, `bun run dev`).
 */
export function runScriptCommand(pm: PackageManagerName, script: string): string {
  switch (pm) {
    case 'pnpm':
    case 'yarn':
      return `${pm} ${script}`
    case 'bun':
      return `bun run ${script}`
    default:
      return `npm run ${script}`
  }
}
