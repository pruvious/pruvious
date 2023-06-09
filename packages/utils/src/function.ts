/**
 * Collection of debounced callbacks.
 */
const debouncePool = {}

/**
 * Force a `callback` to wait a certain amount of time before running again.
 * The callbacks are identified by an `id`, so they can be called in parallel.
 */
export async function debounceParallel(
  id: string,
  callback: (...args: string[]) => any | Promise<any>,
  delay: number | false = 150,
): Promise<void> {
  if (debouncePool[id]) {
    clearTimeout(debouncePool[id])
    delete debouncePool[id]
  }

  if (delay !== false) {
    debouncePool[id] = setTimeout(() => {
      delete debouncePool[id]
      callback()
    }, delay)
  } else {
    await callback()
  }
}
