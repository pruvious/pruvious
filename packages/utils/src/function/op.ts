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

/**
 * Processes an array of promise-generating functions in batches.
 * It ensures that only a specific number of promises are running concurrently.
 *
 * @example
 * ```ts
 * // Example of a function that returns a promise
 * const createDummyTask = (id: number) => () =>
 *   new Promise<string>(resolve => {
 *     const delay = Math.random() * 1000
 *     setTimeout(() => {
 *       console.log(`Task ${id} completed.`)
 *       resolve(`Result of task ${id}`)
 *     }, delay)
 *   })
 *
 * // Create 10 tasks
 * const tasks = Array.from({ length: 10 }, (_, i) => createDummyTask(i + 1))
 *
 * // Run the tasks in batches of 3
 * promiseAllInBatches(tasks, 3)
 *   .then(results => {
 *     console.log('All tasks finished!')
 *     console.log(results)
 *     // Expected output: ['Result of task 1', 'Result of task 2', ..., 'Result of task 10']
 *   })
 *   .catch(console.error)
 * ```
 */
export async function promiseAllInBatches<T>(promiseFns: (() => Promise<T>)[], batchSize = 5): Promise<T[]> {
  let allResults: T[] = []

  for (let i = 0; i < promiseFns.length; i += batchSize) {
    const batchFns = promiseFns.slice(i, i + batchSize)
    const batchPromises = batchFns.map((fn) => fn())
    const batchResults = await Promise.all(batchPromises)
    allResults = allResults.concat(batchResults)
  }

  return allResults
}
