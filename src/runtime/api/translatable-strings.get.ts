import { translatableStrings } from '#pruvious/server'
import parser from 'accept-language-parser'
import { defineEventHandler, getQuery, getRouterParam, setResponseStatus } from 'h3'
import { getModuleOption } from '../instances/state'
import type { TranslatableStringsDefinition } from '../translatable-strings/translatable-strings.definition'
import { __ } from '../utils/server/translate-string'

export default defineEventHandler(async (event) => {
  const domain = getRouterParam(event, 'domain') || 'default'

  if (!(translatableStrings as any)[domain]) {
    setResponseStatus(event, 404)
    return __(event, 'pruvious-server', 'Resource not found')
  }

  const qs = getQuery(event)
  const qsLanguage = qs.language ? qs.language.toString() : ''
  const options = getModuleOption('language')
  const supported = options.supported.map(({ code }) => code)
  const language =
    supported.length > 1 ? parser.pick(supported, qsLanguage, { loose: true }) || options.primary : options.primary
  const definition: Required<TranslatableStringsDefinition> = (translatableStrings as any)[domain][language]?.api
    ? (translatableStrings as any)[domain][language]
    : (translatableStrings as any)[domain][options.primary] ?? (translatableStrings as any)[domain].en

  if (!definition && domain === 'default') {
    return {}
  }

  if (!definition?.api) {
    setResponseStatus(event, 404)
    return __(event, 'pruvious-server', 'Resource not found')
  }

  if (definition.guards && !event.context.auth.user?.isAdmin) {
    for (const guard of definition.guards) {
      try {
        await guard({ definition, user: event.context.auth.user })
      } catch (e: any) {
        setResponseStatus(event, 403)
        return e.message
      }
    }
  }

  return definition.strings
})
