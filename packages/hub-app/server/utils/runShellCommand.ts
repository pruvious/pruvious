import { execa, type ResultPromise } from 'execa'
import { appendDeployLogChunk, writeDeployLog } from './deployLog'

export interface RunShellCommandOptions {
  cwd: string
  env?: NodeJS.ProcessEnv
}

/**
 * Runs `command` through the system shell (so `&&`, `|`, `$VAR`, etc. work) and streams
 * stdout/stderr into the deployment log. Throws on non-zero exit so callers can decide
 * whether the failure should abort the deploy.
 *
 * @param deploymentId - The deployment whose log buffer receives the output.
 * @param label - A short label written before the command runs (e.g. `[hub] pre-build (project)`).
 * @param command - Shell snippet. Empty or whitespace-only strings are skipped (no-op).
 * @param options - `cwd` is required; `env` overrides/extends `process.env`.
 */
export async function runShellCommand(
  deploymentId: number,
  label: string,
  command: string | null | undefined,
  options: RunShellCommandOptions,
): Promise<void> {
  const trimmed = (command ?? '').trim()

  if (!trimmed) {
    return
  }

  await writeDeployLog(deploymentId, `${label}: ${trimmed.split('\n')[0]}${trimmed.includes('\n') ? ' ...' : ''}`)

  const child: ResultPromise = execa(trimmed, {
    shell: true,
    cwd: options.cwd,
    env: options.env,
    stdout: 'pipe',
    stderr: 'pipe',
    reject: false,
  })

  child.stdout?.on('data', (data) => {
    void appendDeployLogChunk(deploymentId, data.toString('utf8'))
  })
  child.stderr?.on('data', (data) => {
    void appendDeployLogChunk(deploymentId, data.toString('utf8'))
  })

  const result = await child

  if (result.failed || result.exitCode !== 0) {
    throw new Error(`${label} exited with code ${result.exitCode ?? 'unknown'}`)
  }
}
