import { isDefined, last, pascalCase } from '@pruvious/utils'
import fs from 'node:fs'
import { useNuxt } from 'nuxt/kit'
import type { NuxtConfigLayer } from 'nuxt/schema'
import { basename, dirname, extname, join, relative } from 'pathe'
import type { PruviousModuleOptions } from '../PruviousModuleOptions'

interface Path {
  /**
   * The absolute path.
   */
  absolute: string

  /**
   * Path relative to the Nuxt workspace.
   */
  relative: string

  /**
   * The import path (without the file extension).
   */
  import: string
}

export interface ResolveOptions {
  /**
   * Absolute filesystem path to resolve files from.
   */
  dir: string

  /**
   * List of file extensions to include when resolving.
   * The extensions should not include the leading dot.
   * When not provided, all files are included.
   *
   * @example
   * ```ts
   * ['js', 'mjs', 'ts']
   * ```
   *
   * @default []
   */
  extensions?: string[]

  /**
   * The Nuxt workspace directory.
   * When not provided, the current workspace directory is used.
   *
   * @default useNuxt().options.workspaceDir
   */
  workspaceDir?: string

  /**
   * Skip empty files.
   *
   * @default true
   */
  skipEmptyFiles?: boolean

  /**
   * Skip files with spaces in their relative paths.
   *
   * @default true
   */
  skipFilesWithSpaces?: boolean
}

export interface ResolveResult {
  /**
   * The file location.
   */
  file: Path

  /**
   * The directory paths where the file is located.
   */
  dir: Path

  /**
   * The filename with its extension (e.g. `document.pdf`).
   */
  name: string

  /**
   * The filename without its extension (e.g. `document`).
   */
  base: string

  /**
   * The file extension without the leading dot (e.g. `pdf`).
   * Returns an empty string if no extension exists.
   */
  ext: string
}

export interface ResolveFromLayersOptions extends Pick<ResolveOptions, 'extensions'> {
  /**
   * A function that returns a relative path from the `nuxtDir` directory.
   * It receives an optional Pruvious module `options` object as a parameter.
   *
   * @example
   * ```ts
   * (options) => options.dir?.collections ?? 'collections'
   * ```
   */
  pruviousDir: (options: Partial<PruviousModuleOptions>, layer: NuxtConfigLayer) => string

  /**
   * A Nuxt directory to resolve files from.
   */
  nuxtDir: 'rootDir' | 'serverDir' | 'srcDir'

  /**
   * A function that is called before resolving files from a Nuxt layer.
   * It receives the Nuxt `layer` configuration as a parameter.
   *
   * @example
   * ```ts
   * (layer) => console.log(`Resolving files from layer <${layer.cwd}>`)
   * ```
   */
  beforeResolve?: (layer: NuxtConfigLayer) => void
}

export interface ResolveFromLayersResult extends ResolveResult {
  /**
   * The current Nuxt layer configuration.
   */
  layer: NuxtConfigLayer

  /**
   * All layers from the Nuxt configuration.
   */
  layers: NuxtConfigLayer[]

  /**
   * All nested directories from the `options.pruviousDir` directory to the resolved file.
   */
  pruviousDirNames: string[]
}

export interface ResolveFromLayersResultContextBinding {
  /**
   * The absolute and relative paths of the file.
   */
  file: Pick<Path, 'absolute' | 'relative'>

  /**
   * The source directory of the Nuxt layer where the `file` is located.
   */
  srcDir: string
}

/**
 * Resolves Pruvious files from a directory specified in the `options` object.
 *
 * @example
 * ```ts
 * for (const result of resolve({ dir: 'path/to/dir', extensions: ['js', 'mjs', 'ts'] })) {
 *   console.log(result)
 * }
 * ```
 */
export function* resolve(options: ResolveOptions): Generator<ResolveResult> {
  if (fs.existsSync(options.dir)) {
    for (const file of fs.readdirSync(options.dir, {
      recursive: true,
    }) as string[]) {
      if (fs.statSync(join(options.dir, file)).isDirectory()) {
        continue
      }

      const _ext = extname(file)
      const ext = _ext ? _ext.slice(1) : ''

      // Skip files with extensions not included in the `extensions` option.
      if (isDefined(options.extensions) && !options.extensions.includes(ext)) {
        continue
      }

      // Skip empty files
      if (options.skipEmptyFiles !== false && !fs.readFileSync(join(options.dir, file), 'utf-8').trim()) {
        continue
      }

      // Skip files with spaces in their names
      if (options.skipFilesWithSpaces !== false && file.includes(' ')) {
        continue
      }

      const absoluteFilePath = join(options.dir, file)
      const workspaceDir = options.workspaceDir ?? useNuxt().options.workspaceDir
      const relativeFilePath = relative(workspaceDir, absoluteFilePath)
      const importFilePath = _ext ? absoluteFilePath.slice(0, -_ext.length) : absoluteFilePath
      const absoluteDirPath = dirname(absoluteFilePath)
      const relativeDirPath = relative(workspaceDir, absoluteDirPath)

      yield {
        file: {
          absolute: absoluteFilePath,
          relative: relativeFilePath,
          import: importFilePath,
        },
        dir: {
          absolute: absoluteDirPath,
          relative: relativeDirPath,
          import: absoluteDirPath,
        },
        name: basename(file),
        base: basename(file, _ext),
        ext,
      }
    }
  }
}

/**
 * Resolves Pruvious files from a directory specified in the `options` object across all Nuxt layers.
 * Layers are resolved from bottom to top.
 *
 * @example
 * ```ts
 * for (const result of resolveFromLayers({
 *   nuxtDir: 'serverDir',
 *   pruviousDir: (options) => options.dir?.collections ?? 'collections',
 *   extensions: ['js', 'mjs', 'ts'],
 * })) {
 *   console.log(result)
 * }
 * ```
 */
export function* resolveFromLayers(options: ResolveFromLayersOptions): Generator<ResolveFromLayersResult> {
  const nuxt = useNuxt()

  for (const layer of nuxt.options._layers) {
    options.beforeResolve?.(layer)

    const nuxtDir = layer.config[options.nuxtDir]

    if (isDefined(nuxtDir)) {
      const pruviousDir = options.pruviousDir(layer.config.pruvious ?? {}, layer)
      const dir = join(nuxtDir, pruviousDir)

      for (const res of resolve({ dir, extensions: options.extensions })) {
        const pruviousDirNames = relative(dir, res.dir.absolute).split('/').filter(Boolean)
        yield { ...res, layer, layers: nuxt.options._layers, pruviousDirNames }
      }
    }
  }
}

/**
 * Processes an array of path `segments` to eliminate redundancy while preserving meaning.
 *
 * - Normalizes all arguments into a PascalCase string before processing.
 * - Removes consecutive duplicate `segments`.
 * - Removes the trailing segment if the `baseName` begins with it.
 * - Handles the case where `baseName` is an index.
 *
 * @returns a reduced array of path `segments` in PascalCase.
 */
export function reduceFileNameSegments(segments: string[], baseName?: string): string[] {
  const result: string[] = []

  for (const segment of segments.map(pascalCase).filter(Boolean)) {
    if (segment !== last(result)) {
      result.push(segment)
    }
  }

  const lastSegment = last(result)

  if (baseName?.trim() && baseName.toLowerCase() !== 'index') {
    const pascalBaseName = pascalCase(baseName)

    if (
      lastSegment &&
      pascalBaseName.startsWith(lastSegment) &&
      !/[^A-Z]/.test(lastSegment[pascalBaseName.length] ?? '')
    ) {
      result.pop()
    }

    result.push(pascalBaseName)
  }

  return result
}
