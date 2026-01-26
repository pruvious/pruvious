import type { Permission } from '#pruvious/server'

export interface PruviousLocalPathModuleOptions {
  /**
   * Defines whether users must be logged in to access the `/api/local-path` endpoint.
   *
   * @default true
   */
  requireAuth: boolean

  /**
   * An array of Pruvious permissions required to access the file system API.
   * Set to `false` to skip this check.
   *
   * @default ['access-dashboard']
   */
  requirePermissions: Permission[] | false
}

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    pruviousLocalPath: Required<PruviousLocalPathModuleOptions>
  }
}

export interface LocalPathFile {
  /**
   * The name of the file or directory (e.g., `my-folder`, `my-file.txt`).
   */
  name: string

  /**
   * The absolute path to the file or directory (e.g., `/home/user/my-folder`).
   */
  path: string

  /**
   * The type of the item, either `directory` or `file`.
   */
  type: 'directory' | 'file'
}
