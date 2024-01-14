import type { FieldInputContext } from '../fields/field.definition'
import { isUndefined } from '../utils/common'

/**
 * Set the field value to its default value if the provided value is `undefined`.
 */
export function defaultSanitizer(context: FieldInputContext) {
  return isUndefined(context.value) ? context.definition.default(context) : context.value
}
