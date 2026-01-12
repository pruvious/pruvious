import { castToNumber, isArray, isNull, isPositiveInteger, isString, isUndefined } from '@pruvious/utils'
import { FieldModel, type Populator } from '../core'

export interface JunctionFieldModelOptions<TCastedType, TPopulatedType> {
  /**
   * Indicates whether an empty array is considered a valid value when the field is required.
   *
   * @default false
   */
  allowEmptyArray?: boolean

  /**
   * The maximum number of items allowed in the array.
   * Set to `false` to disable this limit.
   *
   * @default false
   */
  maxItems?: number | false

  /**
   * The minimum number of items allowed in the array.
   * Set to `false` to disable this limit.
   *
   * @default false
   */
  minItems?: number | false

  /**
   * A function that transforms the field value into a format suitable for application use.
   * It can be used retrieve related data from the database, format the value, or perform other operations.
   * Populators are executed before the query builder returns the resulting rows.
   *
   * The function receives the following arguments in order:
   *
   * - `value` - The casted field value.
   * - `contextField` - The current context field object.
   *
   * The function should return the populated field value or a `Promise` that resolves to it.
   *
   * @default undefined
   *
   * @example
   * ```ts
   * (value, { context }) => {
   *   return isArray(value) ? value.filter((id) => id !== 1) : value
   * }
   * ```
   */
  populator?: Populator<TCastedType, TPopulatedType> | null
}

/**
 * Generates a new `FieldModel` instance for a junction field.
 * This is a virtual field and it **should only be used as a top level field** in a collection.
 * No column will be created in the collection's table for this field.
 * Instead, a separate junction table will be created to manage the many-to-many relationship between the two collections.
 *
 * The default value is `[]`.
 *
 * ---
 *
 * The following sanitizers are applied in order:
 *
 * 1. If the input value is a `string`, it is parsed as JSON.
 * 2. All items in the array are cast to numbers.
 *
 * ---
 *
 * The following validators are applied in order:
 *
 * 1. If the field is required, the value cannot be `undefined`.
 * 2. If the field is required and `allowEmptyArray` is `false`, this field must contain at least one item.
 * 3. The value cannot be `null`.
 * 4. The value must be an `array`.
 * 5. All items in the array must be positive integers.
 * 6. All items in the array must be unique.
 * 7. If the options `minItems` or `maxItems` are set, the number of items in the array must be within the specified range.
 * 8. All items in the array must exist in the `referencedCollection`.
 *
 * @example
 * ```ts
 * {
 *   Events: new Collection({
 *     fields: {
 *       title: new Field({
 *         model: textFieldModel(),
 *         options: {},
 *         required: true,
 *       }),
 *       categories: new Field({
 *         model: junctionFieldModel('Categories'),
 *         options: {},
 *       }),
 *       attendees: new Field({
 *         model: junctionFieldModel('Users', 'events'),
 *         options: {},
 *       }),
 *     },
 *   }),
 *   Categories: new Collection({
 *     fields: {
 *       name: new Field({
 *         model: textFieldModel(),
 *         options: {},
 *         required: true,
 *         validators: [uniqueValidator()],
 *       }),
 *     },
 *     indexes: [{ fields: ['name'], unique: true }],
 *   }),
 *   Users: new Collection({
 *     fields: {
 *       email: new Field({
 *         model: textFieldModel(),
 *         options: {},
 *         required: true,
 *         validators: [emailValidator(), uniqueValidator()],
 *       }),
 *       events: new Field({
 *         model: junctionFieldModel('Events', 'attendees'),
 *         options: {},
 *       }),
 *     },
 *     indexes: [{ fields: ['email'], unique: true }],
 *   }),
 * }
 * ```
 */
export function junctionFieldModel<
  TCollection extends string = string,
  TCastedType = number[],
  TPopulatedType = number[],
  TInputType = (number | string)[],
>(
  /**
   * The collection/table name that this junction refers to.
   */
  referencedCollection: TCollection,

  /**
   * An optional field/column name in the `referencedCollection` that has the corresponding junction to this collection.
   * That field must also be defined using the `junctionFieldModel`.
   *
   * If not provided, the junction is assumed to be unidirectional.
   *
   * @default undefined
   */
  inverseField?: string,
): FieldModel<
  JunctionFieldModelOptions<TCastedType, TPopulatedType>,
  'junction',
  TCastedType,
  TPopulatedType,
  TInputType,
  undefined,
  undefined
> {
  return new FieldModel({
    dataType: 'junction',
    defaultValue: [],
    defaultOptions: {
      allowEmptyArray: false,
      referencedCollection,
      inverseField,
      maxItems: false,
      minItems: false,
      populator: null,
    },
    sanitizers: [
      (value) => {
        if (isString(value)) {
          try {
            return JSON.parse(value)
          } catch {}
        }

        return value
      },
      (value) => {
        if (isArray(value)) {
          return value.map(castToNumber)
        }

        return value
      },
    ],
    validators: [
      (value, { definition, context, path, conditionalLogicResolver, isSubfield }) => {
        if (
          (context.operation === 'insert' || isSubfield) &&
          definition.required &&
          conditionalLogicResolver.results[path] &&
          isUndefined(value)
        ) {
          throw new Error(context.__('pruvious-orm', 'This field is required'))
        }
      },
      (value, { definition, context, path, conditionalLogicResolver }) => {
        if (
          definition.required &&
          conditionalLogicResolver.results[path] &&
          !definition.options.allowEmptyArray &&
          isArray(value) &&
          value.length === 0
        ) {
          throw new Error(context.__('pruvious-orm', 'This field must contain at least one item'))
        }
      },
      (value, { context }) => {
        if (isNull(value)) {
          throw new Error(context.__('pruvious-orm', 'This field is not nullable'))
        }
      },
      (value, { context }) => {
        if (!isArray(value)) {
          throw new Error(context.__('pruvious-orm', 'The value must be an array'))
        }
      },
      (value, { context, path }, errors) => {
        let hasErrors = false

        for (const [i, item] of value.entries()) {
          if (!isPositiveInteger(item)) {
            errors[`${path}.${i}`] = context.__('pruvious-orm', 'The value must be a positive integer')
            hasErrors = true
          }
        }

        if (hasErrors) {
          throw new Error(context.__('pruvious-orm', 'This field contains items of the wrong type'))
        }
      },
      (value, { context, path }, errors) => {
        let hasDuplicates = false

        for (const [i, item] of value.entries()) {
          if (value.indexOf(item) !== i) {
            errors[`${path}.${i}`] = context.__('pruvious-orm', 'The value must be unique')
            hasDuplicates = true
          }
        }

        if (hasDuplicates) {
          throw new Error(context.__('pruvious-orm', 'Each item in this field must be unique'))
        }
      },
      (value, { definition, context }) => {
        const minItems = definition.options.minItems
        const maxItems = definition.options.maxItems

        if (minItems !== false && minItems === maxItems) {
          if (value.length !== minItems) {
            throw new Error(
              context.__('pruvious-orm', 'This field must contain exactly $exact items', { exact: minItems }),
            )
          }
        } else {
          if (minItems !== false && value.length < minItems) {
            throw new Error(
              context.__('pruvious-orm', 'This field must contain at least $min items', { min: minItems }),
            )
          }

          if (maxItems !== false && value.length > maxItems) {
            throw new Error(context.__('pruvious-orm', 'This field must contain at most $max items', { max: maxItems }))
          }
        }
      },
      // @todo add existence validator
    ],
    populator: (value, contextField) => {
      if (contextField.definition.options.populator) {
        return contextField.definition.options.populator(value, contextField)
      }

      return value
    },
  }) as any
}
