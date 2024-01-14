import { useFetch, useNuxtApp, useRuntimeConfig } from '#imports'
import type { FetchableFieldName, PopulatedFieldType, PublicReadCollectionName, SingleCollectionName } from '#pruvious'
import type { PickFields } from '../collections/query-builder'
import { isString, joinRouteParts } from '../utils/string'
import { getLanguage } from './language'
import { usePage } from './page'

/**
 * Retrieves data from a public single-entry collection.
 *
 * The colection must have the `mode` property set to `'single'` and the `apiRoutes.read` property set to `'public'`.
 *
 * @param collection The name of the collection.
 * @param fields The fields to fetch. If not specified, all fields will be fetched.
 * @param cache Whether to cache the response. If set to a number, the response will be cached for the specified number of seconds. Defaults to `true` (cache forever).
 */
export async function getCollectionData<
  C extends SingleCollectionName & PublicReadCollectionName,
  F extends FetchableFieldName[C] = FetchableFieldName[C],
>(
  collection: C,
  fields: PickFields<FetchableFieldName[C], F> | '*' = '*',
  cache: boolean | number = true,
): Promise<Pick<PopulatedFieldType[C], F & keyof PopulatedFieldType[C]>> {
  const nuxtApp = useNuxtApp()
  const runtimeConfig = useRuntimeConfig()
  const { data } = await useFetch(
    joinRouteParts(
      runtimeConfig.app.baseURL, // The subdirectory
      runtimeConfig.public.pruvious.api.prefix,
      'collections',
      collection,
    ),
    {
      query: {
        select: fields === '*' ? undefined : Object.keys(fields).join(','),
        language: usePage().value?.language ?? getLanguage(),
        populate: true,
      },
      key: `${collection}.read.` + (isString(fields) ? fields : Object.keys(fields).join(',')),
      transform: (input: any) => ({
        ...input,
        fetchedAt: new Date(),
      }),
      getCachedData: (key) => {
        if (!cache) {
          return
        }

        const data = nuxtApp.payload.data[key] || nuxtApp.static.data[key]

        if (!data) {
          return
        } else if (cache === true) {
          return data
        }

        const expirationDate = new Date(data.fetchedAt)
        expirationDate.setSeconds(expirationDate.getTime() + cache * 1000)

        if (expirationDate.getTime() < Date.now()) {
          return
        }

        return data
      },
    },
  )

  return data.value
}
