export interface SpawnOptions {
  /**
   * The command to run.
   */
  command: string

  /**
   * Current working directory of the child process.
   *
   * Defaults to `undefined`.
   */
  cwd?: string | URL | undefined

  /**
   * Environment key-value pairs.
   *
   * Defaults to `{}`.
   */
  env?: Record<string, string>

  /**
   * Whether to stream the output to the console.
   *
   * Defaults to `false`.
   */
  showOutput?: boolean

  /**
   * A text prefix for every output line.
   *
   * Defaults to `''`.
   */
  outputPrefix?: string
}
