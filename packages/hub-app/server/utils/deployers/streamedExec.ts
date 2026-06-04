import { execa, type ResultPromise } from 'execa'
import { appendDeployLogChunk } from '../deployLog'

export interface StreamedExecOptions {
  cwd: string
  env?: NodeJS.ProcessEnv
  input?: string
}

/**
 * Spawns `command` with `execa` (no shell), pipes stdout/stderr into the deployment log
 * in real time, and throws on a non-zero exit.
 */
export async function runStreamed(
  deploymentId: number,
  command: string,
  args: string[],
  options: StreamedExecOptions,
): Promise<void> {
  const child: ResultPromise = execa(command, args, {
    cwd: options.cwd,
    env: options.env,
    input: options.input,
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
    throw new Error(`Command \`${command} ${args.join(' ')}\` exited with code ${result.exitCode}`)
  }
}
