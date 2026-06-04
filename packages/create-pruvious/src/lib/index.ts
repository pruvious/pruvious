import { fileURLToPath } from 'node:url'

export { languageCodePattern, languageName, resolveDistTag, resolvePruviousSpec } from './resolvers'
export { scaffoldProject } from './scaffold'
export type { ScaffoldHooks, ScaffoldOptions, ScaffoldResult } from './scaffold'
export { detectPackageManager, installCommand, runScriptCommand } from '../utils/pm'
export type { PackageManagerName } from '../utils/pm'
export { copyTemplate, patchNuxtConfig, patchPackageJSON, toPackageName, writePnpmWorkspace } from '../utils/template'

/**
 * Absolute path to the `create-pruvious/template` directory. Pass this as
 * `ScaffoldOptions.templateDir` when invoking the library from another package.
 */
export const templateDir: string = fileURLToPath(new URL('../../template', import.meta.url))
