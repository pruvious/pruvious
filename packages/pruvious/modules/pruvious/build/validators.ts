import { validatorsMeta } from '@pruvious/orm'

/**
 * Retrieves metadata for all basic validation rules.
 * Also includes a field type suggestion for documentation purposes.
 */
export function getSimpleValidatorsMeta() {
  return validatorsMeta
    .filter(({ name }) => !['unique'].includes(name))
    .map(({ name, comment }) => ({
      name,
      comment,
      exampleField: ['timestamp'].includes(name) ? 'numberField' : 'textField',
    }))
}
