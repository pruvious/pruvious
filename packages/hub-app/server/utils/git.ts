import { execa } from 'execa'
import { appendDeployLogChunk, writeDeployLog } from './deployLog'

export async function readGitCommit(projectPath: string): Promise<string | null> {
  try {
    const { stdout } = await execa('git', ['rev-parse', 'HEAD'], { cwd: projectPath })
    return stdout.trim()
  } catch {
    return null
  }
}

/**
 * Runs `git checkout <branch> && git pull --ff-only`. Throws on failure so the caller
 * can abort the deploy - building from a stale or wrong tree would silently ship the
 * wrong code.
 */
export async function checkoutBranch(deploymentId: number, projectPath: string, branch: string): Promise<void> {
  await writeDeployLog(deploymentId, `[hub] git checkout ${branch}`)
  await stream(deploymentId, 'git', ['checkout', branch], { cwd: projectPath })
  await writeDeployLog(deploymentId, '[hub] git pull')
  await stream(deploymentId, 'git', ['pull', '--ff-only'], { cwd: projectPath })
}

async function stream(deploymentId: number, command: string, args: string[], options: { cwd: string }): Promise<void> {
  const child = execa(command, args, { cwd: options.cwd, stdout: 'pipe', stderr: 'pipe', reject: false })
  child.stdout?.on('data', (data) => void appendDeployLogChunk(deploymentId, data.toString('utf8')))
  child.stderr?.on('data', (data) => void appendDeployLogChunk(deploymentId, data.toString('utf8')))
  const result = await child
  if (result.failed || result.exitCode !== 0) {
    throw new Error(`\`${command} ${args.join(' ')}\` exited with code ${result.exitCode}`)
  }
}
