import { defineField, LanguageCode, languages, primaryLanguage } from '#pruvious/server'
import { objectFieldModel } from '@pruvious/orm'
import { castToString, isObject, isString, isUndefined, remap } from '@pruvious/utils'

const customOptions: {
  /**
   * Indicates whether an empty string is considered a valid text value when the field is required.
   *
   * @default false
   */
  allowEmptyString?: boolean

  /**
   * The maximum length of a translatable text.
   * Set to `false` to disable this validation.
   *
   * @default false
   */
  maxLength?: number | false

  /**
   * The minimum length of a translatable text.
   * Set to `false` to disable this validation.
   *
   * @default false
   */
  minLength?: number | false

  /**
   * Whether to trim each translatable text before saving it to the database.
   *
   * @default true
   */
  trim?: boolean
} = {
  allowEmptyString: false,
  maxLength: false,
  minLength: false,
  trim: true,
}

export default defineField({
  model: objectFieldModel<Record<LanguageCode, string>, string>(),
  default: Object.fromEntries(useRuntimeConfig().pruvious.i18n.languages.map(({ code }) => [code, ''])) as Record<
    LanguageCode,
    string
  >,
  customOptions,
  uiOptions: { placeholder: true },
  sanitizers: [
    (value) => (isObject(value) ? remap(value, (language, text) => [language, castToString(text)]) : value),
    (value, { definition }) =>
      definition.options.trim && isObject(value)
        ? remap(value, (language, text) => [language, isString(text) ? text.trim() : text])
        : value,
  ],
  validators: [
    (value, { definition, context, path, conditionalLogicResolver, isSubfield }, errors) => {
      if (
        (context.operation === 'insert' || isSubfield) &&
        definition.required &&
        conditionalLogicResolver.results[path]
      ) {
        let hasErrors = false

        for (const { code } of languages) {
          if (isUndefined(value[code])) {
            errors[`${path}.${code}`] = context.__('pruvious-orm', 'This field is required')
            hasErrors = true
          }
        }

        if (hasErrors) {
          throw new Error('_ignore') // Break the top-level loop
        }
      }
    },
    (value, { context, path }, errors) => {
      let hasErrors = false

      for (const { code } of languages) {
        if (isUndefined(value[code])) {
          errors[`${path}.${code}`] = context.__('pruvious-api', 'Missing property for language code `$code`', { code })
          hasErrors = true
        }
      }

      for (const language of Object.keys(value)) {
        if (!languages.some(({ code }) => code === language)) {
          errors[`${path}.${language}`] = context.__('pruvious-api', 'Invalid language code')
          hasErrors = true
        }
      }

      if (hasErrors) {
        throw new Error('_ignore') // Break the top-level loop
      }
    },
    (value, { context, path }, errors) => {
      let hasErrors = false

      for (const [language, text] of Object.entries(value)) {
        if (!isString(text)) {
          errors[`${path}.${language}`] = context.__('pruvious-orm', 'The value must be a string')
          hasErrors = true
        }
      }

      if (hasErrors) {
        throw new Error('_ignore') // Break the top-level loop
      }
    },
    (value, { definition, context, path, conditionalLogicResolver }, errors) => {
      if (definition.required && conditionalLogicResolver.results[path] && !definition.options.allowEmptyString) {
        let hasErrors = false

        for (const [language, text] of Object.entries(value)) {
          if (text === '') {
            errors[`${path}.${language}`] = context.__('pruvious-orm', 'This field cannot be left empty')
            hasErrors = true
          }
        }

        if (hasErrors) {
          throw new Error('_ignore') // Break the top-level loop
        }
      }
    },
    (value, { definition, context, path }, errors) => {
      const minLength = definition.options.minLength
      const maxLength = definition.options.maxLength

      let hasErrors = false

      for (const [language, text] of Object.entries(value)) {
        if (minLength !== false && minLength === maxLength) {
          if (text.length !== minLength) {
            errors[`${path}.${language}`] = context.__(
              'pruvious-orm',
              'The value must be exactly `$length` characters long',
              { length: minLength },
            )

            hasErrors = true
          }
        } else {
          if (minLength !== false && text.length < minLength) {
            errors[`${path}.${language}`] = context.__(
              'pruvious-orm',
              'The value must be at least `$min` characters long',
              { min: minLength },
            )
            hasErrors = true
          }

          if (maxLength !== false && text.length > maxLength) {
            errors[`${path}.${language}`] = context.__(
              'pruvious-orm',
              'The value must be at most `$max` characters long',
              { max: maxLength },
            )
            hasErrors = true
          }
        }
      }

      if (hasErrors) {
        throw new Error('_ignore') // Break the top-level loop
      }
    },
  ],
  populator: (value, { context }) => value[(context.customData.language as LanguageCode) ?? primaryLanguage] ?? '',
})
