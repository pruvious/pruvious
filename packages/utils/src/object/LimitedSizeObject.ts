/**
 * A size-limited object implementation using Map with FIFO (First In First Out) behavior.
 * When the object reaches its maximum size, the oldest entry is removed to make space for new entries.
 *
 * @example
 * ```ts
 * const object = new LimitedSizeObject<number>(3)
 *
 * object.set('a', 1) // { a: 1 }
 * object.set('b', 2) // { a: 1, b: 2 }
 * object.set('c', 3) // { a: 1, b: 2, c: 3 }
 * object.set('d', 4) // { b: 2, c: 3, d: 4 } - 'a' was removed as it was the oldest
 *
 * console.log(object.get('b'))  // 2
 * console.log(object.entries()) // [['b', 2], ['c', 3], ['d', 4]]
 * ```
 */
export class LimitedSizeObject<T> {
  protected data = new Map()

  constructor(protected maxSize: number) {}

  /**
   * Adds or updates a `value` in the object.
   * If the object is full and the key doesn't exist, removes the oldest entry before adding the new one.
   */
  set(key: string, value: T): true {
    if (this.data.size >= this.maxSize && !this.data.has(key)) {
      const firstKey = this.data.keys().next().value
      this.data.delete(firstKey)
    }

    this.data.set(key, value)

    return true
  }

  /**
   * Retrieves a value from the object by its `key`.
   */
  get(key: string): T | undefined {
    return this.data.get(key)
  }

  /**
   * Checks if the object contains a `key`.
   */
  has(key: string): boolean {
    return this.data.has(key)
  }

  /**
   * Removes a `key` from the object.
   */
  delete(key: string): boolean {
    return this.data.delete(key)
  }

  /**
   * Returns all entries in the object as an array of key-value pairs.
   * The order of entries reflects their insertion order (oldest first).
   */
  entries(): [string, T][] {
    return Array.from(this.data.entries())
  }
}
