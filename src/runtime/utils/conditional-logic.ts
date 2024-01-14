import type { CastedBlockData, Field } from '#pruvious'
import type { CollectionFieldAdditional, ConditionalLogic, ConditionalRule } from '../fields/field.definition'
import { isArray } from './array'
import { isUndefined } from './common'
import { getProperty, isObject } from './object'
import { isString } from './string'

/**
 * Determines whether the specified `input` values meet the criteria defined by the given `conditionalLogic` of a `fieldPath`.
 * The `fieldPath` must be specified in dot notation (e.g., `fieldName`, `parent.fieldName`, `object.array[0].fieldName`, etc.).
 *
 * @throws An error if a field referenced in the conditional logic is not defined in the `input`.
 */
export function matchesConditionalLogic(
  input: Record<string, any>,
  fieldPath: string,
  conditionalLogic: ConditionalLogic | Record<string, ConditionalRule | boolean | number | string>,
): boolean {
  for (const [key, condition] of Object.entries(conditionalLogic)) {
    if (key === '$every') {
      if (!condition.every((rule: Record<string, any>) => matchesConditionalLogic(input, fieldPath, rule))) {
        return false
      }
    } else if (key === '$some') {
      if (!condition.some((rule: Record<string, any>) => matchesConditionalLogic(input, fieldPath, rule))) {
        return false
      }
    } else {
      const dependencyPath = new URL(
        key.replace(/(?<!^|\.)\./gim, '/'),
        `http://_/${fieldPath.replaceAll('.', '/')}`,
      ).pathname
        .slice(1)
        .replaceAll('/', '.')
        .replace(/\.$/, '')

      const dependencyValue = getProperty(input, dependencyPath) as any

      if (isUndefined(dependencyValue)) {
        throw new Error(`The field '${dependencyPath}' is required in the input`)
      }

      if (isObject(condition)) {
        for (const [operator, value] of Object.entries(condition)) {
          let preparedValue = dependencyValue

          if (operator === 'gt' || operator === 'gte' || operator === 'lt' || operator === 'lte') {
            if (isArray(dependencyValue)) {
              preparedValue = dependencyValue.length
            } else if (typeof dependencyValue !== typeof value) {
              return false
            }
          } else if (operator === 'regexp' && !isString(dependencyValue)) {
            return false
          }

          if (
            (operator === 'eq' && preparedValue !== value) ||
            (operator === 'ne' && preparedValue === value) ||
            (operator === 'gt' && preparedValue <= value) ||
            (operator === 'gte' && preparedValue < value) ||
            (operator === 'lt' && preparedValue >= value) ||
            (operator === 'lte' && preparedValue > value) ||
            (operator === 'regexp' && !new RegExp(value.toString()).test(preparedValue))
          ) {
            return false
          }
        }
      } else if (dependencyValue !== condition) {
        return false
      }
    }
  }

  return true
}

/**
 * Resolves the conditional logic of a collection record using the default resolver.
 * Nested fields are supported for the `blocks` and `repeater` fields.
 */
export async function resolveConditionalLogic(
  record: Record<string, any>,
  fields: Record<
    string,
    Pick<Field, 'options' | 'type'> & { additional: Pick<CollectionFieldAdditional, 'conditionalLogic'> }
  >,
  fieldNamePrefix = '',
): Promise<Record<string, boolean>> {
  const resolved: Record<string, boolean> = {}

  for (const [fieldName, declaration] of Object.entries(fields)) {
    try {
      resolved[fieldNamePrefix + fieldName] = declaration.additional?.conditionalLogic
        ? matchesConditionalLogic(record, fieldNamePrefix + fieldName, declaration.additional.conditionalLogic!)
        : true

      if (declaration.type === 'block' && (getProperty(record, fieldNamePrefix + fieldName) as any)?.name) {
        const { blocks } = await import('#pruvious/blocks')
        const blockData: CastedBlockData = getProperty(record, fieldNamePrefix + fieldName) as any

        // Block fields
        Object.assign(
          resolved,
          await resolveConditionalLogic(
            record,
            (blocks as any)[blockData.name].fields,
            `${fieldNamePrefix + fieldName}.fields.`,
          ),
        )

        // Block slots
        if (blockData.slots) {
          const slots = blockData.slots as Record<string, { block: CastedBlockData }[]>

          for (const slotName of Object.keys(slots)) {
            for (let i = 0; i < slots[slotName].length; i++) {
              Object.assign(
                resolved,
                await resolveConditionalLogic(
                  record,
                  { block: { type: 'block', options: {}, additional: {} } },
                  `${fieldNamePrefix + fieldName}.slots.${slotName}.${i}.`,
                ),
              )
            }
          }
        }
      } else if (declaration.type === 'repeater') {
        for (let i = 0; i < (getProperty(record, fieldNamePrefix + fieldName) as any).length; i++) {
          Object.assign(
            resolved,
            await resolveConditionalLogic(
              record,
              (declaration.options as any).subfields,
              `${fieldNamePrefix + fieldName}.${i}.`,
            ),
          )
        }
      }
    } catch (e: any) {
      resolved[fieldNamePrefix + fieldName] = false
    }
  }

  return resolved
}
