import { existsSync } from 'node:fs'
import { join } from 'pathe'
import { parse as parseShell } from 'shell-quote'

export interface ResolvedBuildCommand {
  cmd: string
  args: string[]
}

/**
 * If `override` is provided it is tokenised with `shell-quote` (quoted args survive) and
 * run directly via execa - no shell, so env-prefixes, pipes, redirects and `&&` are not
 * supported. Use the EnvironmentVariables collection for env, or wrap complex logic in a
 * `package.json` script.
 *
 * Otherwise picks the package manager from the project lockfile: `pnpm-lock.yaml`,
 * `bun.lock(b)`, `yarn.lock`, falling back to npm.
 *
 * @throws if `override` tokenises to zero args or contains a shell operator.
 */
export function resolveBuildCommand(projectPath: string, override?: string | null): ResolvedBuildCommand {
  if (override && override.trim()) {
    const parsed = parseShell(override)
    const tokens: string[] = []

    for (const token of parsed) {
      if (typeof token === 'string') {
        tokens.push(token)
      } else {
        const repr = 'op' in token ? token.op : 'pattern' in token ? token.pattern : JSON.stringify(token)
        throw new Error(
          `Build command contains an unsupported shell operator (\`${repr}\`); execa runs without a shell.`,
        )
      }
    }

    if (tokens.length === 0) {
      throw new Error('Build command override resolved to an empty argv after parsing.')
    }

    return { cmd: tokens[0]!, args: tokens.slice(1) }
  }

  if (existsSync(join(projectPath, 'pnpm-lock.yaml'))) {
    return { cmd: 'pnpm', args: ['run', 'build'] }
  }
  if (existsSync(join(projectPath, 'bun.lock')) || existsSync(join(projectPath, 'bun.lockb'))) {
    return { cmd: 'bun', args: ['run', 'build'] }
  }
  if (existsSync(join(projectPath, 'yarn.lock'))) {
    return { cmd: 'yarn', args: ['build'] }
  }
  return { cmd: 'npm', args: ['run', 'build'] }
}
