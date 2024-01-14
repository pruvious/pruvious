import type { CollectionField } from '#pruvious'
import type { FieldValidatorContext } from '../fields/field.definition'
import { getModuleOption } from '../instances/state'
import { getProperty } from '../utils/object'

/**
 * Validate if the provided field value is unique within the collection.
 *
 * This validation is performed during create and update operations, and it is capable of simultaneously processing multiple records.
 */
export async function uniqueValidator(context: FieldValidatorContext, customErrorMessage?: string) {
  if (context.operation === 'read') {
    return
  }

  const query = context.currentQuery as any
  const errorMessage =
    customErrorMessage ?? context.__(context.language, 'pruvious-server', 'This field must be unique')
  const unique =
    getProperty<CollectionField>(
      context.collection?.fields ?? {},
      context.name.replace(/\.([0-9]+)\./g, '.options.subfields.'),
    )?.additional?.unique ?? 'perLanguage'

  if (unique === 'allLanguages') {
    if (context.allInputs?.some((input) => input !== context.input && input[context.name] === context.value)) {
      throw new Error(errorMessage)
    }

    if (context.operation === 'create' && (await query.clone().reset().where(context.name, context.value).exists())) {
      throw new Error(errorMessage)
    }

    if (context.operation === 'update') {
      // When updating multiple records
      const subjects = await query.clone().clearGroup().clearOffset().clearLimit().select({ id: true }).all()

      if (subjects.length > 1) {
        throw new Error(errorMessage)
      } else if (
        subjects.length === 1 &&
        (await query.clone().reset().where(context.name, context.value).whereNe('id', subjects[0].id).exists())
      ) {
        throw new Error(errorMessage)
      }
    }
  } else {
    const primaryLanguage = getModuleOption('language').primary

    if (
      context.allInputs?.some(
        (input) =>
          input !== context.input &&
          input[context.name] === context.value &&
          (input.language ?? primaryLanguage) === (context.input.language ?? primaryLanguage),
      )
    ) {
      throw new Error(errorMessage)
    }

    if (
      context.operation === 'create' &&
      (await query
        .clone()
        .reset()
        .where(context.name, context.value)
        .where('language', context.input.language ?? primaryLanguage)
        .exists())
    ) {
      throw new Error(errorMessage)
    }

    if (context.operation === 'update') {
      // When updating multiple records
      const subjects = await query
        .clone()
        .clearGroup()
        .clearOffset()
        .clearLimit()
        .select({ id: true, language: true })
        .all()

      if (subjects.length > 1) {
        throw new Error(errorMessage)
      } else if (
        subjects.length === 1 &&
        (await query
          .clone()
          .reset()
          .where(context.name, context.value)
          .where('language', subjects[0].language)
          .whereNe('id', subjects[0].id)
          .exists())
      ) {
        throw new Error(errorMessage)
      }
    }
  }
}
