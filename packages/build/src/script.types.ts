export interface ScriptOptions {
  /**
   * Initial script path.
   */
  input: string

  /**
   * Output file or directory path for the build operation.
   */
  output: string

  /**
   * Whether to treat the `output` path as a directory.
   *
   * Defaults to `false`.
   */
  outdir?: boolean

  /**
   * The targeted build platform.
   */
  platform: 'browser' | 'neutral' | 'node'

  /**
   * This sets the target environment for the generated JavaScript code. It
   * tells `esbuild` to transform JavaScript syntax that is too new for these
   * environments into older JavaScript syntax that will work in these
   * environments. For example, the `??` operator was introduced in `Chrome 80`
   * so `esbuild` will convert it into an equivalent (but more verbose)
   * conditional expression when targeting `Chrome 79` or earlier.
   *
   * Note that this is only concerned with syntax features, not APIs. It does
   * not automatically add polyfills for new APIs that are not used by these
   * environments. You will have to explicitly import polyfills for the APIs
   * you need (e.g. by importing `core-js`). Automatic polyfill injection is
   * not available.
   *
   * Each target environment is an environment name followed by a version
   * number. The following environment names are currently supported:
   *
   * - `chrome`
   * - `deno`
   * - `edge`
   * - `firefox`
   * - `hermes`
   * - `ie`
   * - `ios`
   * - `node`
   * - `opera`
   * - `rhino`
   * - `safari`
   *
   * Defaults to `'es2020'` if platform is set to `'browser'` and `'node16.3.0'` if
   * the platform is `'node'`.
   *
   * @see https://esbuild.github.io/api/#target
   */
  target?: string | string[]

  /**
   * Name of the script to show in the console logs.
   *
   * Defaults to the relative `input` path.
   */
  name?: string

  /**
   * Whether to listen for changes on the file system and to rebuild whenever
   * a file changes that could invalidate the build.
   *
   * Defaults to `false`.
   */
  watch?: boolean

  /**
   * Whether to minify the output file. When set to `auto`, the output is
   * minified when the `watch` option is set to `false` and vice versa.
   *
   * Defaults to `'auto'`.
   */
  minify?: boolean | 'auto'

  /**
   * Mark a file or a package as external to exclude it from your build.
   * Instead of being bundled, the import will be preserved (using require for
   * the `iife` and `cjs` formats and using import for the esm format) and will
   * be evaluated at run time instead.
   *
   * Defaults to `[]`.
   */
  external?: string[]

  /**
   * Whether to empty the output directory before the build operation.
   *
   * Defaults to `false`.
   */
  emptyOutputDir?: boolean

  /**
   * Whether to build TypeScript declaration files in parallel.
   *
   * Defaults to `true`.
   */
  declarations?: boolean

  /**
   * Determines whether show any log output.
   *
   * Defaults to `false`.
   */
  silent?: boolean

  /**
   * Number of milliseconds to debounce the `complete$` observable.
   *
   * Defaults to `50`.
   */
  completeDebounce?: number

  /**
   * Whether to show the build started message.
   *
   * Defaults to `true`.
   */
  showStartMessage?: boolean

  /**
   * Whether to show the build completed message.
   *
   * Defaults to `true`.
   */
  showEndMessage?: boolean

  /**
   * Whether to show timestamps in log messages.
   *
   * Defaults to `true`.
   */
  showTimestamps?: boolean
}
