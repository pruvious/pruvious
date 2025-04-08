import {
  deepClone,
  getProperty,
  isArray,
  isObject,
  isRealNumber,
  isString,
  isUndefined,
  resolveRelativeDotNotation,
  uniqueArray,
} from '@pruvious/utils'
import type { ConditionalLogic, ConditionalOrGroup, ConditionalRule } from './types'

/**
 * Resolves conditional logic for fields.
 *
 * @example
 * ```ts
 * const resolver = new ConditionalLogicResolver()
 *
 * resolver.setInput({
 *   type: 'text',
 *   text: 'blue',
 *   variant: 'light',
 * })
 *
 * resolver.match('text', { type: { '=': 'text' } })
 * // true
 *
 * resolver.match('variant', {
 *   type: { '=': 'text' },
 *   text: { '!=': null },
 * })
 * // true
 * ```
 */
export class ConditionalLogicResolver {
  results: Record<string, boolean> = {}

  protected input: Record<string, any> = {}
  protected conditionalLogic: Record<string, ConditionalLogic | undefined> = {}
  protected cache: Record<string, any> = {}

  /**
   * Assigns a new input object for pattern matching.
   * The input values should be sanitized before use.
   */
  setInput(input: Record<string, any>): this {
    this.input = input
    return this.clearCache()
  }

  /**
   * Applies conditional logic to all fields within a collection.
   *
   * The `parsedConditionalLogic` parameter is an object where:
   *
   * - Keys are field paths (use dot notation for nested fields).
   * - Values are corresponding conditional logic objects to evaluate (if present).
   */
  setConditionalLogic(parsedConditionalLogic: Record<string, ConditionalLogic | undefined>) {
    this.conditionalLogic = parsedConditionalLogic
    return this.clearCache()
  }

  /**
   * Retrieves a copy of the current conditional logic object.
   *
   * Returns an object where:
   *
   * - Keys are field paths (use dot notation for nested fields).
   * - Values are corresponding conditional logic objects to evaluate (if present).
   */
  getConditionalLogic() {
    return deepClone(this.conditionalLogic)
  }

  /**
   * Compares a specified `fieldPath` from the input data against the provided `conditionalLogic`.
   * Supports dot notation for accessing nested fields.
   *
   * If no conditional logic is provided, it uses the logic previously set by `setConditionalLogic`.
   *
   * Requires calling `setInput` to establish the input object before use.
   *
   * @returns `true` if the field matches the conditional logic, `false` otherwise
   */
  match(fieldPath: string): boolean
  match(fieldPath: string, conditionalLogic: ConditionalLogic): boolean
  match(fieldPath: string, conditionalLogic?: ConditionalLogic): boolean {
    conditionalLogic = conditionalLogic ?? this.conditionalLogic[fieldPath]

    if (!conditionalLogic) {
      return true
    }

    if (isArray(conditionalLogic)) {
      for (const item of conditionalLogic) {
        if (!this.match(fieldPath, item)) {
          return false
        }
      }
    } else {
      for (const [key, item] of Object.entries(conditionalLogic)) {
        if (key === 'orGroup' && isArray(item)) {
          let orMatch = false

          for (const orItem of item as ConditionalOrGroup['orGroup']) {
            if (this.match(fieldPath, orItem)) {
              orMatch = true
              break
            }
          }

          if (!orMatch) {
            return false
          }
        } else {
          const refPath = this.resolveRelativePath(fieldPath, key)
          const realRefValue = this.getFieldValue(refPath)
          const refValue = isArray(realRefValue) ? realRefValue.length : realRefValue

          for (const [op, value] of Object.entries(item as ConditionalRule)) {
            if (op === '=' && refValue !== value) {
              return false
            } else if (op === '!=' && refValue === value) {
              return false
            } else if (op === '>' && (!isRealNumber(refValue) || refValue <= (value as number))) {
              return false
            } else if (op === '>=' && (!isRealNumber(refValue) || refValue < (value as number))) {
              return false
            } else if (op === '<' && (!isRealNumber(refValue) || refValue >= (value as number))) {
              return false
            } else if (op === '<=' && (!isRealNumber(refValue) || refValue > (value as number))) {
              return false
            } else if (
              op === 'regexp' &&
              (!isString(refValue) ||
                !(isObject(value) ? new RegExp(value.pattern, value.flags) : new RegExp(value as string)).test(
                  refValue,
                ))
            ) {
              return false
            }
          }
        }
      }
    }

    return true
  }

  /**
   * Retrieves a list of referenced field paths in the given `conditionalLogic`.
   * The `fieldPath` parameter is the field that the conditional logic is applied to.
   *
   * If no conditional logic is provided, it uses the logic previously set by `setConditionalLogic`.
   */
  getReferencedFieldPaths(fieldPath: string): string[]
  getReferencedFieldPaths(fieldPath: string, conditionalLogic: ConditionalLogic): string[]
  getReferencedFieldPaths(fieldPath: string, conditionalLogic?: ConditionalLogic): string[] {
    conditionalLogic = conditionalLogic ?? this.conditionalLogic[fieldPath]

    if (!conditionalLogic) {
      return []
    }

    const fields: string[] = []

    if (isArray(conditionalLogic)) {
      for (const item of conditionalLogic) {
        fields.push(...this.getReferencedFieldPaths(fieldPath, item))
      }
    } else {
      for (const [key, item] of Object.entries(conditionalLogic)) {
        if (key === 'orGroup' && isArray(item)) {
          for (const orItem of item as ConditionalOrGroup['orGroup']) {
            fields.push(...this.getReferencedFieldPaths(fieldPath, orItem))
          }
        } else {
          fields.push(this.resolveRelativePath(fieldPath, key))
        }
      }
    }

    return uniqueArray(fields)
  }

  /**
   * Evaluates all field inputs against their defined conditional logic.
   *
   * This method uses:
   *
   * - The input object set by `setInput`.
   * - The conditional logic set by `setConditionalLogic`.
   *
   * Returns an object where:
   *
   * - Keys are field paths using dot notation for nested fields.
   * - Values are booleans indicating if the field matches its conditional logic.
   *
   * The returned object is also stored and accessible via the `results` property.
   */
  resolve() {
    this.clearCache()

    const sortedConditionalLogic = Object.entries(this.conditionalLogic).sort(([a], [b]) => a.length - b.length)
    const failed: string[] = []

    for (const [field, conditionalLogic] of sortedConditionalLogic) {
      if (failed.some((path) => field.startsWith(`${path}.`))) {
        this.results[field] = false
      } else {
        this.results[field] = conditionalLogic ? this.match(field, conditionalLogic) : true

        if (!this.results[field]) {
          failed.push(field)
        }
      }
    }

    return this.results
  }

  protected getFieldValue(fieldPath: string) {
    if (isUndefined(this.cache[`field:${fieldPath}`])) {
      this.cache[`field:${fieldPath}`] = getProperty(this.input, fieldPath)
    }

    return this.cache[`field:${fieldPath}`]
  }

  protected resolveRelativePath(fieldPath: string, ref: string) {
    if (isUndefined(this.cache[`refPath:${fieldPath}:${ref}`])) {
      this.cache[`refPath:${fieldPath}:${ref}`] = resolveRelativeDotNotation(fieldPath, ref)
    }

    return this.cache[`refPath:${fieldPath}:${ref}`]
  }

  /**
   * Creates a deep clone of the current resolver instance.
   */
  clone() {
    const clone = new ConditionalLogicResolver()

    clone.results = { ...this.results }
    clone.input = deepClone(this.input)
    clone.conditionalLogic = deepClone(this.conditionalLogic)
    clone.cache = deepClone(this.cache)

    return clone
  }

  /**
   * Clears all cached data and `results`.
   */
  clearCache() {
    this.results = {}
    this.cache = {}
    return this
  }
}
