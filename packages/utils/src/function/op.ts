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
