import { actions, filters, type Actions, type Filters } from '#pruvious/client'

/**
 * Registers a new client-side action function for a given action `name`.
 *
 * Actions are functions that allow you to hook into specific points in the application flow.
 * They provide a way to execute custom code without changing the original implementation.
 *
 * Place your actions anywhere in the `app/actions/` directory.
 * Before executing any actions, you must define them with the `defineAction<Context>()` function.
 *
 * Actions run in the order they are added.
 * If you need to change the order, you can pass the `priority` argument to the `addAction` function.
 * The lower the number, the earlier the action runs.
 * The default priority is `10`.
 *
 * Consider grouping only related actions together in a single file to maintain logical organization.
 * When using `loadActions('action-name')`, all action files containing 'action-name' will be loaded into the application.
 * This approach may load additional actions beyond your immediate needs in the client, which can impact performance.
 *
 * Note: The function name `addAction` must remain unchanged and not be aliased.
 *
 * @example
 * ```ts
 * // app/hooks/actions/foo/before.ts
 * import { defineAction } from '#pruvious/client'
 *
 * export default defineAction<{ time: number }>()
 *
 * // app/hooks/actions/foo/after.ts
 * import { defineAction } from '#pruvious/client'
 *
 * export default defineAction<{ time: number }>()
 *
 * // app/actions/foo.ts
 * import { addAction } from '#pruvious/client'
 *
 * addAction('foo:before', ({ time }) => {
 *   // Do something
 * })
 *
 * addAction('foo:after', ({ time }) => {
 *   // Do something
 * })
 *
 * // app/utils/foo.ts
 * import { doActions, loadActions } from '#pruvious/client'
 *
 * await loadActions('foo:before', 'foo:after')
 *
 * export async function foo() {
 *   await doActions('foo:before', { time: performance.now() })
 *   // Do something
 *   await doActions('foo:after', { time: performance.now() })
 * }
 * ```
 */
export function addAction<
  TName extends keyof Actions,
  TAction extends Actions[TName]['TContext'] extends undefined
    ? () => any
    : (context: Actions[TName]['TContext']) => any,
>(name: TName, action: TAction, priority = 10) {
  actions[name] ??= []
  actions[name].push({ callback: action, priority: priority ?? 10 })
  actions[name].sort((a, b) => a.priority - b.priority)
}

/**
 * Executes all actions registered for a given action `name`.
 *
 * @example
 * ```ts
 * // app/hooks/actions/foo/before.ts
 * import { defineAction } from '#pruvious/client'
 *
 * export default defineAction<{ time: number }>()
 *
 * // app/hooks/actions/foo/after.ts
 * import { defineAction } from '#pruvious/client'
 *
 * export default defineAction<{ time: number }>()
 *
 * // app/actions/foo.ts
 * import { addAction } from '#pruvious/client'
 *
 * addAction('foo:before', ({ time }) => {
 *   // Do something
 * })
 *
 * addAction('foo:after', ({ time }) => {
 *   // Do something
 * })
 *
 * // app/utils/foo.ts
 * import { doActions, loadActions } from '#pruvious/client'
 *
 * await loadActions('foo:before', 'foo:after')
 *
 * export async function foo() {
 *   await doActions('foo:before', { time: performance.now() })
 *   // Do something
 *   await doActions('foo:after', { time: performance.now() })
 * }
 * ```
 */
export async function doActions<
  TName extends keyof Actions,
  TContext extends [Actions[TName]['TContext']] extends [never] ? {} : Actions[TName]['TContext'],
>(name: TName, context: TContext): Promise<void> {
  if (actions[name]) {
    for (const { callback } of actions[name]) {
      await callback(context)
    }
  }
}

/**
 * Registers a new client-side filter function for a given filter `name`.
 *
 * Filters are functions that allow modification of data at specific points in the application flow.
 * They provide a way to transform data without changing the original implementation.
 *
 * Place your filters anywhere in the `app/filters/` directory.
 * Before applying any filters in your application, you must first load them with the `loadFilters()` function.
 * Before you can load filters, you must define them with the `defineFilter<Value, Context>()` function.
 *
 * Filters run in the order they are added.
 * If you need to change the order, you can pass the `priority` argument to the `addFilter` function.
 * The lower the number, the earlier the filter runs.
 * The default priority is `10`.
 *
 * Consider grouping only related filters together in a single file to maintain logical organization.
 * When using `loadFilters('filter-name')`, all filter files containing 'filter-name' will be loaded into the application.
 * This approach may load additional filters beyond your immediate needs in the client, which can impact performance.
 *
 * Note: The function name `addFilter` must remain unchanged and not be aliased.
 *
 * @example
 * ```ts
 * // app/hooks/filters/foo/returnable.ts
 * import { defineFilter } from '#pruvious/client'
 *
 * export default defineFilter<string>()
 *
 * // app/filters/foo.ts
 * import { addFilter } from '#pruvious/client'
 *
 * addFilter('foo:returnable', (value) => {
 *   return value + ', world!'
 * })
 *
 * // app/utils/foo.ts
 * import { applyFilters, loadFilters } from '#pruvious/client'
 *
 * await loadFilters('foo:returnable')
 *
 * export async function foo() {
 *   const returnable = 'Hello'
 *   return applyFilters('foo:returnable', returnable, {})
 * }
 * ```
 */
export function addFilter<
  TName extends keyof Filters,
  TFilter extends Filters[TName]['TContext'] extends undefined
    ? (value: Filters[TName]['TValue']) => Filters[TName]['TValue'] | Promise<Filters[TName]['TValue']>
    : (
        value: Filters[TName]['TValue'],
        context: Filters[TName]['TContext'],
      ) => Filters[TName]['TValue'] | Promise<Filters[TName]['TValue']>,
>(name: TName, filter: TFilter, priority = 10) {
  filters[name] ??= []
  filters[name].push({ callback: filter, priority: priority ?? 10 })
  filters[name].sort((a, b) => a.priority - b.priority)
}

/**
 * Applies all filters registered for a given filter `name`.
 *
 * @example
 * ```ts
 * // app/hooks/filters/foo/returnable.ts
 * import { defineFilter } from '#pruvious/client'
 *
 * export default defineFilter<string>()
 *
 * // app/filters/foo.ts
 * import { addFilter } from '#pruvious/client'
 *
 * addFilter('foo:returnable', (value) => {
 *   return value + ', world!'
 * })
 *
 * // app/utils/foo.ts
 * import { applyFilters, loadFilters } from '#pruvious/client'
 *
 * await loadFilters('foo:returnable')
 *
 * export async function foo() {
 *   const returnable = 'Hello'
 *   return applyFilters('foo:returnable', returnable, {})
 * }
 * ```
 */
export async function applyFilters<
  TName extends keyof Filters,
  TValue extends Filters[TName]['TValue'],
  TContext extends [Filters[TName]['TContext']] extends [never] ? {} : Filters[TName]['TContext'],
>(name: TName, value: TValue, context: TContext): Promise<TValue> {
  if (filters[name]) {
    for (const { callback } of filters[name]) {
      value = await callback(value, context)
    }
  }

  return value
}
