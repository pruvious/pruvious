import type { Permission } from '#pruvious/server'
import type { ServerFileContext } from './server/index'

export interface BuildActions {
  /**
   * Called when the Pruvious module is ready (after all build steps are complete).
   */
  'module:ready': { TContext: {} }

  /**
   * Called before generating the content of the `#pruvious/server` file.
   */
  '#pruvious/server:before-generate-content': { TContext: ServerFileContext & { content: string[] } }
}

export interface BuildFilters {
  /**
   * Allows modification of Pruvious permissions.
   */
  'permissions': { TValue: (Permission | (string & {}))[]; TContext: {} }

  /**
   * Allows modification of the standard Pruvious routes.
   */
  'standardRoutes': { TValue: string[]; TContext: {} }

  /**
   * Allows modification of the `#pruvious/server` file content before it is written.
   */
  '#pruvious/server': { TValue: string[]; TContext: ServerFileContext }
}

const buildActions: Record<string, { callback: Function; priority: number }[]> = {}
const buildFilters: Record<string, { callback: Function; priority: number }[]> = {}

/**
 * Registers a new build action function for a given action `name`.
 *
 * Build actions are functions that allow you to hook into specific points in the Pruvious build process.
 * They provide a way to execute custom code without changing the original implementation.
 *
 * Build actions are only executed during the build phase of the application.
 * If you need to run code during runtime, consider using regular client/server actions instead (`addAction()`).
 *
 * Place your build actions anywhere in the `server/build/` directory.
 *
 * Actions run in the order they are added.
 * If you need to change the order, you can pass the `priority` argument to the `addAction` function.
 * The lower the number, the earlier the action runs.
 * The default priority is `10`.
 *
 * Note: You cannot import any `#pruvious/*` modules inside build actions, as they are not available during build time.
 *
 * @example
 * ```ts
 * // server/build/ready.ts
 * import { addBuildAction } from 'pruvious/kit'
 *
 * addBuildAction('module:ready', () => {
 *   // Do something
 * })
 * ```
 */
export function addBuildAction<
  TName extends keyof BuildActions,
  TAction extends BuildActions[TName]['TContext'] extends undefined
    ? () => any
    : (context: BuildActions[TName]['TContext']) => any,
>(name: TName, action: TAction, priority = 10) {
  buildActions[name] ??= []
  buildActions[name].push({ callback: action, priority: priority ?? 10 })
  buildActions[name].sort((a, b) => a.priority - b.priority)
}

/**
 * Registers a new build filter function for a given filter `name`.
 *
 * Build filters are functions that allow modification of data at specific points in the Pruvious build process.
 * They provide a way to transform data without changing the original implementation.
 *
 * Build filters are only executed during the build phase of the application.
 * If you need to run code during runtime, consider using regular client/server filters instead (`addFilter()`).
 *
 * Place your build filters anywhere in the `server/build/` directory.
 *
 * Filters run in the order they are added.
 * If you need to change the order, you can pass the `priority` argument to the `addFilter` function.
 * The lower the number, the earlier the filter runs.
 * The default priority is `10`.
 *
 * Note: You cannot import any `#pruvious/*` modules inside build filters, as they are not available during build time.
 *
 * @example
 * ```ts
 * // server/build/my-custom-permission.ts
 * import { addBuildFilter } from 'pruvious/kit'
 *
 * addBuildFilter('permissions', (permissions) => {
 *   if (!permissions.includes('my-custom-permission'))
 *     permissions.push('my-custom-permission')
 *   }
 *   return permissions
 * })
 * ```
 */
export function addBuildFilter<
  TName extends keyof BuildFilters,
  TFilter extends BuildFilters[TName]['TContext'] extends undefined
    ? (value: BuildFilters[TName]['TValue']) => BuildFilters[TName]['TValue'] | Promise<BuildFilters[TName]['TValue']>
    : (
        value: BuildFilters[TName]['TValue'],
        context: BuildFilters[TName]['TContext'],
      ) => BuildFilters[TName]['TValue'] | Promise<BuildFilters[TName]['TValue']>,
>(name: TName, filter: TFilter, priority = 10) {
  buildFilters[name] ??= []
  buildFilters[name].push({ callback: filter, priority: priority ?? 10 })
  buildFilters[name].sort((a, b) => a.priority - b.priority)
}

/**
 * Executes all registered build actions for a given action `name`.
 */
export async function doBuildActions<
  TName extends keyof BuildActions,
  TContext extends [BuildActions[TName]['TContext']] extends [never] ? {} : BuildActions[TName]['TContext'],
>(name: TName, context: TContext): Promise<void> {
  if (buildActions[name]) {
    for (const { callback } of buildActions[name]) {
      await callback(context)
    }
  }
}

/**
 * Applies all build filters registered for a given filter `name`.
 */
export async function applyBuildFilters<
  TName extends keyof BuildFilters,
  TValue extends BuildFilters[TName]['TValue'],
  TContext extends [BuildFilters[TName]['TContext']] extends [never] ? {} : BuildFilters[TName]['TContext'],
>(name: TName, value: TValue, context: TContext): Promise<TValue> {
  if (buildFilters[name]) {
    for (const { callback } of buildFilters[name]) {
      value = await callback(value, context)
    }
  }

  return value
}
