import { execa } from 'execa'
import { Client, type ClientChannel } from 'ssh2'
import { appendDeployLogChunk, writeDeployLog } from './deployLog'

export interface SshConnectOptions {
  host: string
  port: number
  username: string
  privateKey: string
  /**
   * Used to stream remote stdout/stderr into the same log buffer the dashboard's SSE
   * feed reads from.
   */
  deploymentId: number
}

export interface SshExecOptions {
  /**
   * Wrap the command in `sudo -n`. Requires the SSH user to have passwordless sudo.
   */
  sudo?: boolean

  /**
   * If true, a non-zero exit code is returned instead of throwing. Use for idempotency
   * probes ("is node installed?") where failure is expected.
   */
  allowFail?: boolean

  input?: string

  /**
   * Mirror remote stdout/stderr into the deploy log. Defaults to `true`; set to `false`
   * for noisy idempotency checks whose output the operator does not need to see.
   */
  stream?: boolean
}

export interface SshExecResult {
  exitCode: number
  stdout: string
  stderr: string
}

export interface SshSession {
  exec: (command: string, options?: SshExecOptions) => Promise<SshExecResult>
  writeFile: (remotePath: string, content: string, options?: { sudo?: boolean; mode?: string }) => Promise<void>
  tarUpload: (localDir: string, remoteDir: string, options?: { sudo?: boolean }) => Promise<void>
  close: () => void
}

/**
 * Opens an SSH connection and returns a promise-based facade. Wrap calls in a
 * `try/finally` and invoke `close()` so the connection is released on error paths too.
 */
export async function connect(opts: SshConnectOptions): Promise<SshSession> {
  const client = new Client()

  await new Promise<void>((resolve, reject) => {
    let settled = false
    const onError = (err: Error) => {
      if (settled) {
        return
      }
      settled = true
      reject(err)
    }
    const onReady = () => {
      if (settled) {
        return
      }
      settled = true
      resolve()
    }
    client.once('ready', onReady)
    client.once('error', onError)
    client.connect({
      host: opts.host,
      port: opts.port,
      username: opts.username,
      privateKey: opts.privateKey,
      readyTimeout: 30_000,
      keepaliveInterval: 15_000,
    })
  })

  const exec: SshSession['exec'] = (command, execOpts = {}) => runExec(client, opts.deploymentId, command, execOpts)

  const writeFile: SshSession['writeFile'] = async (remotePath, content, fileOpts = {}) => {
    // Pipe content into `tee` so we can write into /etc and other root-owned paths
    // without depending on SFTP's permission model.
    const sudoPrefix = fileOpts.sudo ? 'sudo -n ' : ''
    const cmd = `${sudoPrefix}tee ${shellQuote(remotePath)} > /dev/null`
    const result = await runExec(client, opts.deploymentId, cmd, { input: content, stream: false })
    if (result.exitCode !== 0) {
      throw new Error(`writeFile failed (${remotePath}): exit ${result.exitCode} ${result.stderr.trim()}`)
    }
    if (fileOpts.mode) {
      const chmod = await runExec(
        client,
        opts.deploymentId,
        `${sudoPrefix}chmod ${shellQuote(fileOpts.mode)} ${shellQuote(remotePath)}`,
        { stream: false },
      )
      if (chmod.exitCode !== 0) {
        throw new Error(`chmod ${fileOpts.mode} failed (${remotePath}): ${chmod.stderr.trim()}`)
      }
    }
  }

  const tarUpload: SshSession['tarUpload'] = async (localDir, remoteDir, uploadOpts = {}) => {
    const sudoPrefix = uploadOpts.sudo ? 'sudo -n ' : ''
    await writeDeployLog(opts.deploymentId, `[vps] uploading ${localDir} -> ${remoteDir}`)

    const local = execa('tar', ['-C', localDir, '-cf', '-', '.'], {
      stdout: 'pipe',
      stderr: 'pipe',
      reject: false,
    })

    const channel = await new Promise<ClientChannel>((resolve, reject) => {
      client.exec(
        `${sudoPrefix}mkdir -p ${shellQuote(remoteDir)} && ${sudoPrefix}tar -C ${shellQuote(remoteDir)} -xf -`,
        (err, stream) => {
          if (err) {
            reject(err)
            return
          }
          resolve(stream)
        },
      )
    })

    if (local.stdout) {
      local.stdout.pipe(channel.stdin)
    }
    if (local.stderr) {
      local.stderr.on('data', (data) => {
        void appendDeployLogChunk(opts.deploymentId, data.toString('utf8'))
      })
    }
    channel.stderr.on('data', (data) => {
      void appendDeployLogChunk(opts.deploymentId, data.toString('utf8'))
    })

    const [, remoteExit] = await Promise.all([
      local,
      new Promise<number>((resolve) => {
        channel.on('close', (code: number) => resolve(code ?? 0))
      }),
    ])

    if (remoteExit !== 0) {
      throw new Error(`tarUpload: remote tar exited with code ${remoteExit}`)
    }
  }

  return {
    exec,
    writeFile,
    tarUpload,
    close: () => client.end(),
  }
}

async function runExec(
  client: Client,
  deploymentId: number,
  command: string,
  options: SshExecOptions,
): Promise<SshExecResult> {
  const wrapped = options.sudo ? `sudo -n bash -lc ${shellQuote(command)}` : command
  const stream = options.stream !== false

  return new Promise<SshExecResult>((resolve, reject) => {
    client.exec(wrapped, (err, channel) => {
      if (err) {
        reject(err)
        return
      }

      let stdout = ''
      let stderr = ''

      channel.on('data', (data: Buffer) => {
        const chunk = data.toString('utf8')
        stdout += chunk
        if (stream) {
          void appendDeployLogChunk(deploymentId, chunk)
        }
      })
      channel.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString('utf8')
        stderr += chunk
        if (stream) {
          void appendDeployLogChunk(deploymentId, chunk)
        }
      })
      channel.on('close', (code: number | null) => {
        const exitCode = code ?? 0
        if (exitCode !== 0 && !options.allowFail) {
          reject(new Error(`Remote command exited with code ${exitCode}: ${command}\n${stderr.trim()}`))
          return
        }
        resolve({ exitCode, stdout, stderr })
      })
      channel.on('error', (e: Error) => reject(e))

      if (options.input !== undefined) {
        channel.stdin.write(options.input)
        channel.stdin.end()
      }
    })
  })
}

/**
 * Single-argument POSIX shell quoting. Wraps in single quotes, escaping embedded single
 * quotes the standard way.
 */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}
