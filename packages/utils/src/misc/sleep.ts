/**
 * Pauses execution for the specified `milliseconds`.
 *
 * @example
 * ```ts
 * await sleep(50)
 * ```
 */
export async function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
