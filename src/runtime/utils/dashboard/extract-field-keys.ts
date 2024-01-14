import type { FieldLayout } from '../../collections/collection.definition'
import { isArray } from '../array'
import { isObject } from '../object'
import { isString } from '../string'

export function extractFieldKeys(fieldLayout: FieldLayout[]): string[] {
  const keys: string[] = []

  for (const item of fieldLayout) {
    if (isString(item)) {
      keys.push(item.split('|')[0].trim())
    } else if (isArray(item)) {
      keys.push(...item.map((subitem) => subitem.split('|')[0].trim()))
    } else if (isObject(item)) {
      for (const fields of Object.values(item)) {
        keys.push(...extractFieldKeys(fields))
      }
    }
  }

  return keys
}
