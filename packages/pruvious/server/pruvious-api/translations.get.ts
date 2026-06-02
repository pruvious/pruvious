import { __, assertParams, i18n, languages } from '#pruvious/server'
import { isBCP47LanguageCode, isString } from '@pruvious/utils'

export default defineEventHandler(async (event) => {
  const { domain, language } = getQuery(event)
  const { fallbackLanguages } = useRuntimeConfig().pruvious.i18n

  await assertParams(
    { domain, language },
    {
      domain: [
        { test: Boolean, message: __('pruvious-api', 'This query parameter is required') },
        { test: isString, message: __('pruvious-orm', 'The value must be a string') },
      ],
      language: [
        { test: Boolean, message: __('pruvious-api', 'This query parameter is required') },
        { test: isString, message: __('pruvious-orm', 'The value must be a string') },
        {
          test: (value: string) => {
            if (!isBCP47LanguageCode(value)) {
              return false
            }
            if (languages.some((lang) => lang.code === value)) {
              return true
            }
            const registered = i18n.getLanguages()
            return registered.includes(value) || registered.includes(value.split('-')[0]!)
          },
          message: __('pruvious-api', 'Invalid language code'),
        },
      ],
    },
  )

  const merged = i18n.getDefinition(domain as string, language as string)
  if (merged) {
    return merged.strings
  }

  for (const lang of fallbackLanguages) {
    const definition = i18n.getDefinition(domain as string, lang)
    if (definition) {
      return definition.strings
    }
  }

  return {}
})
