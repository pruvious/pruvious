import { isFunction as _isFunction } from '@antfu/utils'

/**
 * Execute functions in groups, returning a group-keyed object where the key represents the group
 * where an error occurred, and the value is the error message of the first function that threw an error.
 *
 * If an error occurs in a group, subsequent functions within the same group won't be called.
 *
 * @example
 * ```typescript
 * await catchFirstErrorMessage({
 *   foo: [() => valid(), () => invalid(), () => never()],
 *   bar: [async () => await validPromise()],
 * })
 * // Output: { foo: "Message from 'invalid' function" }
 * ```
 */
export async function catchFirstErrorMessage<T extends string>(
  groups: Record<T, ((...args: any[]) => any | Promise<any>)[]>,
): Promise<Partial<Record<T, string>>> {
  const results: Record<string, string> = {}

  for (const [name, callbacks] of Object.entries<any>(groups)) {
    for (const callback of callbacks) {
      try {
        await callback()
      } catch (e: any) {
        results[name] = e.message
        break
      }
    }
  }

  return results
}

/**
 * Check if a `value` is a function.
 *
 * @example
 * ```typescript
 * isFunction(() => null) // true
 * isFunction({})         // false
 * ```
 */
export const isFunction: <T extends Function>(value: any) => value is T = _isFunction

/**
 * Pause execution for the specified `milliseconds`.
 *
 * @example
 * ```typescript
 * await sleep(50)
 * ```
 */
export async function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
