/**
 * Defines a new server-side action hook.
 *
 * Use this as the default export in a file within the `server/hooks/actions/` directory.
 * The subdirectories and filename determine the action name, which should be in kebab-case.
 * For example, `server/hooks/actions/foo/bar-baz.ts` will define the server-side action `foo:bar-baz`.
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
 * // server/hooks/actions/foo/before.ts
 * import { defineAction } from '#pruvious/server'
 *
 * export default defineAction<{ time: number }>()
 *
 * // server/hooks/actions/foo/after.ts
 * import { defineAction } from '#pruvious/server'
 *
 * export default defineAction<{ time: number }>()
 *
 * // server/actions/foo.ts
 * import { addAction } from '#pruvious/server'
 *
 * addAction('foo:before', ({ time }) => {
 *   // Do something
 * })
 *
 * addAction('foo:after', ({ time }) => {
 *   // Do something
 * })
 *
 * // server/utils/foo.ts
 * import { doActions } from '#pruvious/server'
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
 * Defines a new server-side filter hook.
 *
 * Use this as the default export in a file within the `server/hooks/filters/` directory.
 * The subdirectories and filename determine the filter name, which should be in kebab-case.
 * For example, `server/hooks/filters/foo/bar-baz.ts` will define the server-side filter `foo:bar-baz`.
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
 * // server/hooks/filters/foo/returnable.ts
 * import { defineFilter } from '#pruvious/server'
 *
 * export default defineFilter<string>()
 *
 * // server/filters/foo.ts
 * import { addFilter } from '#pruvious/server'
 *
 * addFilter('foo:returnable', (value) => {
 *   return value + ', world!'
 * })
 *
 * // server/utils/foo.ts
 * import { applyFilters } from '#pruvious/server'
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
