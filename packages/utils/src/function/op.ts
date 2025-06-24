import { isFunction } from './is'

/**
 * Executes a function and returns its result, or returns the `fn` value as is if not a function.
 *
 * @example
 * ```ts
 * executeOrReturn(() => 'foo') // 'foo'
 * executeOrReturn('foo')       // 'foo'
 *
 * const square = (n: number) => n * n
 * executeOrReturn(square, 4)   // 16
 * ```
 */
export function executeOrReturn<T, Args extends T extends (...args: any[]) => any ? Parameters<T> : never[]>(
  fn: T,
  ...args: Args
): T extends (...args: any[]) => any ? ReturnType<T> : T {
  return isFunction(fn) ? fn(...args) : (fn as any)
}

/**
 * Ensures the `input` is a `Promise`.
 *
 * - If the input is a function, it is executed. Its return value is wrapped in a promise.
 *   - If the function throws an error, a rejected promise is returned.
 * - If the input is already a promise, it's returned directly.
 * - If the input is any other value, it's wrapped in a resolved promise.
 */
export function toPromise(input: any) {
  try {
    const result = typeof input === 'function' ? input() : input
    return Promise.resolve(result)
  } catch (error) {
    return Promise.reject(error)
  }
}
