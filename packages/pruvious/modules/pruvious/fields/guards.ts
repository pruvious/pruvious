import type { ConditionalLogic, Database, GenericValidator } from '@pruvious/orm'
import type { FieldGuard } from './define'

/**
 * Transforms field `guards` into validator functions.
 *
 * The transformation process is exclusively compatible with the guarded query builder functions:
 *
 * - `guardedQueryBuilder()`
 * - `guardedInsertInto(collection)`
 * - `guardedSelectFrom(collection)`
 * - `guardedUpdate(collection)`
 * - `guardedDeleteFrom(collection)`
 *
 * @see https://pruvious.com/docs/fields/guards (@todo set up this link)
 */
export function transformFieldGuardsToValidators(
  guards: FieldGuard<
    any,
    Record<string, any>,
    boolean,
    boolean,
    boolean,
    boolean,
    ConditionalLogic | undefined,
    Database
  >[],
): GenericValidator[] {
  return guards.map((guard) => async (value, sanitizedContextField, errors) => {
    if (sanitizedContextField.context.customData._guarded) {
      await guard(value, sanitizedContextField, errors)
    }
  })
}
