import { __, assertParams, i18n } from '#pruvious/server'
import { isString } from '@pruvious/utils'

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
      ],
    },
  )

  for (const lang of [language, ...fallbackLanguages]) {
    const definition = i18n.getDefinition(domain as string, lang as string)

    if (definition) {
      return definition.strings
    }
  }

  return {}
})
