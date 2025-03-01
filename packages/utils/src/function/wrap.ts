export interface RetryOptions {
  /**
   * The maximum number of attempts to make before giving up.
   *
   * @default 10
   */
  attempts?: number

  /**
   * The delay in milliseconds between each attempt.
   *
   * @default 250
   */
  delay?: number
}

/**
 * Calls a function only if it's not already running.
 * The `lock` object is used to prevent multiple calls of the same function.
 *
 * @example
 * ```ts
 * const isFormDisabled = { value: false } // or ref(false)
 * const submit = lockAndLoad(isFormDisabled, async (event: Event) => { ... })
 * ```
 */
export function lockAndLoad<TArgs extends unknown[], TReturn>(
  lock: { value: boolean },
  fn: (...args: TArgs) => Promise<TReturn> | TReturn,
): (...args: TArgs) => Promise<TReturn | void> {
  return async (...args: TArgs) => {
    if (!lock.value) {
      lock.value = true
      const result = await fn(...args)
      lock.value = false
      return result
    }
  }
}

/**
 * Retries a function until it resolves or the maximum number of attempts is reached.
 *
 * The `options` object can be used to configure the number of attempts and delay between each attempt.
 * The default number of attempts is `10` and the default delay is `250` milliseconds.
 *
 * @example
 * ```ts
 * await retry(
 *   (resolve) => {
 *     if (Math.random() > 0.5) {
 *       resolve()
 *     }
 *   },
 *   { attempts: 5, delay: 100 },
 * )
 * ```
 */
export async function retry(fn: (resolve: () => void) => any, options?: RetryOptions) {
  const { attempts = 10, delay = 250 } = options ?? {}
  let attempt = 0

  return new Promise<void>((resolve, reject) => {
    const run = () => {
      if (attempt++ < attempts) {
        fn(resolve)
        setTimeout(run, delay)
      } else {
        reject(new Error(`Retry failed after ${attempts} attempts`))
      }
    }

    run()
  })
}
