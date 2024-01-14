import type { RuntimeConfig } from '@nuxt/schema'
import { parse } from './bytes'
import { isNumber } from './number'
import { setProperty } from './object'
import { camelCase, isString, joinRouteParts, kebabCase, snakeCase } from './string'

const special = [
  'baseComponents',
  'baseUrl',
  'customCapabilities',
  'expirationLong',
  'legalLinks',
  'localStorageKey',
  'localStorageKey',
  'maxFileSize',
  'renewInterval',
  'searchInterval',
  'secretKey',
  'singleCollectionsTable',
  'standardCollections',
  'standardFields',
  'standardHooks',
  'standardJobs',
  'standardMiddleware',
  'standardTranslatableStrings',
  'urlPrefix',
].map((key) => snakeCase(key).toUpperCase())

/**
 * Apply environment variables starting with `NUXT_PRUVIOUS_` and `NUXT_PUBLIC_PRUVIOUS_` to module options during an early phase.
 * Additionally, resolve specific module options.
 */
export function patchModuleOptions(runtimeConfig: RuntimeConfig) {
  for (const [key, value] of Object.entries(process.env)) {
    for (const [prefix, object] of [
      ['NUXT_PRUVIOUS_', runtimeConfig.pruvious],
      ['NUXT_PUBLIC_PRUVIOUS_', runtimeConfig.public.pruvious],
    ] as [string, object][]) {
      if (key.startsWith(prefix)) {
        let path = key.slice(prefix.length)

        for (const word of special) {
          path = path.replace(word, kebabCase(word))
        }

        path = path
          .replaceAll('_', '.')
          .split('.')
          .map((part) => camelCase(part.toLowerCase()))
          .join('.')

        setProperty(object, path, value)
      }
    }
  }

  if (runtimeConfig.public.pruvious.language && !runtimeConfig.public.pruvious.language.supported?.length) {
    runtimeConfig.public.pruvious.language.supported.push({ name: 'English', code: 'en' })
  }

  if (runtimeConfig.pruvious.uploads?.drive?.type === 's3') {
    ;(runtimeConfig.pruvious.uploads.drive as any).baseUrl = (
      runtimeConfig.pruvious.uploads.drive as any
    ).baseUrl.replace(/\/*$/, '/')
  }

  ;(runtimeConfig.public.pruvious as any).uploadsBase =
    runtimeConfig.pruvious.uploads?.drive?.type === 's3'
      ? (runtimeConfig.pruvious.uploads.drive as any).baseUrl
      : joinRouteParts(runtimeConfig.app.baseURL, runtimeConfig.pruvious.uploads.drive.urlPrefix ?? 'uploads') + '/'

  if (isString(runtimeConfig.pruvious.uploads?.maxFileSize)) {
    ;(runtimeConfig.pruvious.uploads as any).maxFileSize = parse(runtimeConfig.pruvious.uploads.maxFileSize as string)!
  } else if (runtimeConfig.pruvious.uploads && !isNumber(runtimeConfig.pruvious.uploads?.maxFileSize)) {
    ;(runtimeConfig.pruvious.uploads as any).maxFileSize = parse('16 MB')
  }
}
