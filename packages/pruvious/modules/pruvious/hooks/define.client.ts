/**
 * Defines a new client-side action hook.
 *
 * Use this as the default export in a file within the `app/hooks/actions/` directory.
 * The subdirectories and filename determine the action name, which should be in kebab-case.
 * For example, `app/hooks/actions/foo/bar-baz.ts` will define the client-side action `foo:bar-baz`.
 *
 * Actions are functions that allow you to hook into specific points in the application flow.
 * They provide a way to execute custom code without changing the original implementation.
 *
 * The `defineAction<Context>()` function accepts a single generic TypeScript parameter:
 *
 * - `Context` - An optional object that specifies the shared data and state available to the action during execution.
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
export function defineAction<Context extends Record<string, any> = {}>(): { TContext: Context } {
  return null as any
}

/**
 * Defines a new client-side filter hook.
 *
 * Use this as the default export in a file within the `app/hooks/filters/` directory.
 * The subdirectories and filename determine the filter name, which should be in kebab-case.
 * For example, `app/hooks/filters/foo/bar-baz.ts` will define the client-side filter `foo:bar-baz`.
 *
 * Filters are functions that allow modification of data at specific points in the application flow.
 * They provide a way to transform data without changing the original implementation.
 *
 * The `defineFilter<Value, Context>()` function accepts two generic TypeScript parameters:
 *
 * - `Value` - The type of the value that the filter will modify and return.
 * - `Context` - An optional object that specifies the shared data and state available to the filter during execution.
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
export function defineFilter<Value = any, Context extends Record<string, any> = {}>(): {
  TValue: Value
  TContext: Context
} {
  return null as any
}
