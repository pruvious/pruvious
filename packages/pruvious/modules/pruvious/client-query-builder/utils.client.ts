import type { Collections, Singletons } from '#pruvious/server'
import type { SelectQueryBuilderParams } from '@pruvious/orm/'
import {
  decodeQueryString,
  queryStringToSelectQueryBuilderParams,
  selectQueryBuilderParamsToQueryString,
} from '@pruvious/orm/query-string'
import { deepClone, omit } from '@pruvious/utils'
import type { DeleteQueryBuilder } from './DeleteQueryBuilder'
import type { InsertQueryBuilder } from './InsertQueryBuilder'
import { QueryBuilder } from './QueryBuilder'
import type { SelectQueryBuilder } from './SelectQueryBuilder'
import { SingletonSelectQueryBuilder } from './SingletonSelectQueryBuilder'
import { SingletonUpdateQueryBuilder } from './SingletonUpdateQueryBuilder'
import type { UpdateQueryBuilder } from './UpdateQueryBuilder'

/**
 * Creates a client-side `InsertQueryBuilder` for a specific `collection`.
 * Enables type-safe inserting of collection records through HTTP requests.
 *
 * This function is intended for use in the Pruvious dashboard.
 *
 * @example
 * ```ts
 * import { insertInto } from '#pruvious/client'
 *
 * const newStudents = await insertInto('Students')
 *   .values([
 *     { firstName: 'Harry', lastName: 'Potter', house: 1 },
 *     { firstName: 'Hermione', lastName: 'Granger', house: 1 },
 *     { firstName: 'Draco', lastName: 'Malfoy', house: 2, prefect: true },
 *   ])
 *   .returning(['firstName', 'lastName'])
 *   .run()
 *
 * console.log(newStudents)
 * // {
 * //   success: true,
 * //   data: [
 * //     { firstName: 'Harry', lastName: 'Potter' },
 * //     { firstName: 'Hermione', lastName: 'Granger' },
 * //     { firstName: 'Draco', lastName: 'Malfoy' },
 * //   ],
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const insertedBookCount = await insertInto('Books')
 *   .values([
 *     { title: 'Hogwarts: A History', author: 'Bathilda Bagshot' },
 *     { title: 'Fantastic Beasts and Where to Find Them', author: 'Newt Scamander' },
 *   ])
 *   .run()
 *
 * console.log(insertedBookCount)
 * // {
 * //   success: true,
 * //   data: 2,
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const failedInsert = await insertInto('Spells')
 *   .values([{ name: 'Avada Kedavra' }])
 *   .returning(['name'])
 *   .run()
 *
 * console.log(failedInsert)
 * // {
 * //   success: false,
 * //   data: undefined,
 * //   runtimeError: undefined,
 * //   inputErrors: [{
 * //     'type': 'This field is required',
 * //     'difficulty': 'This field is required',
 * //   }],
 * // }
 * ```
 */
export function insertInto<
  TCollections extends Collections,
  TCollectionName extends keyof TCollections,
  // @ts-expect-error
>(collectionName: TCollectionName): InsertQueryBuilder<TCollections, TCollectionName, TCollections[TCollectionName]> {
  return new QueryBuilder().insertInto(collectionName as any) as any
}

/**
 * Creates a client-side `SelectQueryBuilder` for a specific `collection`.
 * Enables type-safe fetching of collection records through HTTP requests.
 *
 * This function is intended for use in the Pruvious dashboard.
 *
 * @example
 * ```ts
 * import { selectFrom } from '#pruvious/client'
 *
 * const students = await selectFrom('Students')
 *   .select(['firstName', 'lastName'])
 *   .all()
 *
 * console.log(students)
 * // {
 * //   success: true,
 * //   data: [
 * //     { firstName: 'Harry', lastName: 'Potter' },
 * //     { firstName: 'Hermione', lastName: 'Granger' },
 * //     { firstName: 'Ron', lastName: 'Weasley' },
 * //     // ...
 * //   ],
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const houses = await selectFrom('Houses')
 *   .selectAll()
 *   .all()
 *
 * console.log(houses)
 * // {
 * //   success: true,
 * //   data: [
 * //     {
 * //       id: 1,
 * //       name: 'Gryffindor',
 * //       founder: 'Godric Gryffindor',
 * //       createdAt: 1724091250000,
 * //       updatedAt: 1724091250000,
 * //     },
 * //     {
 * //       id: 2,
 * //       name: 'Slytherin',
 * //       founder: 'Salazar Slytherin',
 * //       createdAt: 1724091250000,
 * //       updatedAt: 1724091250000,
 * //     },
 * //     {
 * //       id: 3,
 * //       name: 'Ravenclaw',
 * //       founder: 'Rowena Ravenclaw',
 * //       createdAt: 1724091250000,
 * //       updatedAt: 1724091250000,
 * //     },
 * //     {
 * //       id: 4,
 * //       name: 'Hufflepuff',
 * //       founder: 'Helga Hufflepuff',
 * //       createdAt: 1724091250000,
 * //       updatedAt: 1724091250000,
 * //     },
 * //   ],
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const failedSelect = await selectFrom('Wands')
 *   .select(['wood', 'core', 'length', 'wandmaker'])
 *   .all()
 *
 * console.log(failedSelect)
 * // {
 * //   success: false,
 * //   data: undefined,
 * //   runtimeError: "The field 'wandmaker' does not exist",
 * //   inputErrors: undefined,
 * // }
 * ```
 */
export function selectFrom<
  TCollections extends Collections,
  TCollectionName extends keyof TCollections,
  // @ts-expect-error
>(collectionName: TCollectionName): SelectQueryBuilder<TCollections, TCollectionName, TCollections[TCollectionName]> {
  return new QueryBuilder().selectFrom(collectionName as any) as any
}

/**
 * Creates a client-side `UpdateQueryBuilder` for a specific `collection`.
 * Enables type-safe updating of collection records through HTTP requests.
 *
 * This function is intended for use in the Pruvious dashboard.
 *
 * @example
 * ```ts
 * import { update } from '#pruvious/client'
 *
 * const updatedStudent = await update('Students')
 *   .set({ house: 2, prefect: true })
 *   .where('firstName', '=', 'Harry')
 *   .where('lastName', '=', 'Potter')
 *   .returning(['firstName', 'lastName', 'house', 'prefect'])
 *   .run()
 *
 * console.log(updatedStudent)
 * // {
 * //   success: true,
 * //   data: [
 * //     { firstName: 'Harry', lastName: 'Potter', house: 2, prefect: true },
 * //   ],
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const updatedBookCount = await update('Books')
 *   .set({ author: 'Newt Scamander' })
 *   .where('title', '=', 'Fantastic Beasts and Where to Find Them')
 *   .run()
 *
 * console.log(updatedBookCount)
 * // {
 * //   success: true,
 * //   data: 1,
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const failedUpdate = await update('Spells')
 *   .set({ difficulty: 'Impossible' })
 *   .where('name', '=', 'Expelliarmus')
 *   .returning(['name', 'difficulty'])
 *   .run()
 *
 * console.log(failedUpdate)
 * // {
 * //   success: false,
 * //   data: undefined,
 * //   runtimeError: undefined,
 * //   inputErrors: {
 * //     'difficulty': 'Invalid difficulty level',
 * //   },
 * // }
 * ```
 */
export function update<
  TCollections extends Collections,
  TCollectionName extends keyof TCollections,
  // @ts-expect-error
>(collectionName: TCollectionName): UpdateQueryBuilder<TCollections, TCollectionName, TCollections[TCollectionName]> {
  return new QueryBuilder().update(collectionName as any) as any
}

/**
 * Creates a client-side `DeleteQueryBuilder` for a specific `collection`.
 * Enables type-safe deleting of collection records through HTTP requests.
 *
 * This function is intended for use in the Pruvious dashboard.
 *
 * @example
 * ```ts
 * import { deleteFrom } from '#pruvious/client'
 *
 * const deletedStudent = await deleteFrom('Students')
 *   .where('firstName', '=', 'Draco')
 *   .where('lastName', '=', 'Malfoy')
 *   .returning(['firstName', 'lastName'])
 *   .run()
 *
 * console.log(deletedStudent)
 * // {
 * //   success: true,
 * //   data: [
 * //     { firstName: 'Draco', lastName: 'Malfoy' },
 * //   ],
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const deletedBookCount = await deleteFrom('Books')
 *   .where('author', '=', 'Gilderoy Lockhart')
 *   .run()
 *
 * console.log(deletedBookCount) // 7
 *
 * const failedDelete = await deleteFrom('Houses')
 *   .where('name', 'Slytherin')
 *   .returning(['name'])
 *   .run()
 *
 * console.log(failedDelete)
 * // {
 * //   success: false,
 * //   data: undefined,
 * //   runtimeError: 'Cannot delete a Hogwarts house',
 * //   inputErrors: undefined,
 * // }
 * ```
 */
export function deleteFrom<
  TCollections extends Collections,
  TCollectionName extends keyof TCollections,
  // @ts-expect-error
>(collectionName: TCollectionName): DeleteQueryBuilder<TCollections, TCollectionName, TCollections[TCollectionName]> {
  return new QueryBuilder().deleteFrom(collectionName as any) as any
}

/**
 * Creates a client-side `SingletonSelectQueryBuilder` for a specific `singleton`.
 * Enables type-safe deleting of collection records through HTTP requests.
 *
 * This function is intended for use in the Pruvious dashboard.
 *
 * @example
 * ```ts
 * import { selectSingleton } from '#pruvious/client'
 *
 * const themeOptions = await selectSingleton('ThemeOptions')
 *   .select(['logo', 'copyrightText'])
 *   .get()
 *
 * console.log(themeOptions)
 * // {
 * //   success: true,
 * //   data: {
 * //     logo: 123,
 * //     copyrightText: '© 2025 Example Inc.',
 * //   },
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const failedSelect = await selectSingleton('ThemeOptions')
 *   .select('nonExistentField')
 *   .get()
 *
 * console.log(failedSelect)
 * // {
 * //   success: false,
 * //   data: undefined,
 * //   runtimeError: "The field 'nonExistentField' does not exist",
 * //   inputErrors: undefined,
 * // }
 * ```
 */
export function selectSingleton<const TSingletonName extends keyof Singletons>(
  name: TSingletonName,
): SingletonSelectQueryBuilder<TSingletonName> {
  return new SingletonSelectQueryBuilder(name)
}

/**
 * Creates a client-side `SingletonUpdateQueryBuilder` for a specific `singleton`.
 * Enables type-safe deleting of collection records through HTTP requests.
 *
 * This function is intended for use in the Pruvious dashboard.
 *
 * @example
 * ```ts
 * import { updateSingleton } from '#pruvious/client'
 *
 * const updatedThemeOptions = await updateSingleton('ThemeOptions')
 *   .set({ logo: 456 })
 *   .returning(['logo', 'copyrightText'])
 *   .run()
 *
 * console.log(updatedThemeOptions)
 * // {
 * //   success: true,
 * //   data: {
 * //     logo: 456,
 * //     copyrightText: '© 2025 Example Inc.',
 * //   },
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const failedUpdate = await updateSingleton('ThemeOptions')
 *   .set({ logo: 'foo' })
 *   .returning(['logo', 'copyrightText'])
 *   .run()
 *
 * console.log(failedUpdate)
 * // {
 * //   success: false,
 * //   data: undefined,
 * //   runtimeError: undefined,
 * //   inputErrors: {
 * //     'logo': 'The value must be a number or `null`',
 * //   },
 * // }
 * ```
 */
export function updateSingleton<const TSingletonName extends keyof Singletons>(
  name: TSingletonName,
): SingletonUpdateQueryBuilder<TSingletonName> {
  return new SingletonUpdateQueryBuilder(name)
}

/**
 * Composable that monitors URL parameters for the `SelectQueryBuilder` and triggers a callback on parameter changes.
 * Used for data refresh operations, such as fetching collection data using a client-side `QueryBuilder`.
 *
 * This composable is client-side only and is intended for use in the Pruvious dashboard.
 */
export function useSelectQueryBuilderParams(options: {
  /**
   * Function that gets called whenever the URL query parameters change.
   */
  callback: (context: {
    queryString: string
    params: Omit<SelectQueryBuilderParams, 'select' | 'groupBy' | 'offset' | 'limit' | 'populate'>
  }) => any

  /**
   * Default parameters to use when the URL query parameters are not set.
   *
   * @default
   * {
   *   page: 1,
   *   perPage: 50,
   * }
   */
  defaultParams?: Omit<SelectQueryBuilderParams, 'select' | 'groupBy' | 'offset' | 'limit' | 'populate'>

  /**
   * Determines whether parameters with default values should be hidden in the URL query string.
   *
   * @default true
   */
  hideDefaultParams?: boolean

  /**
   * Determines whether query builder parameters should be automatically initialized using current URL query parameters.
   *
   * @default true
   */
  init?: boolean

  /**
   * Controls if the composable should monitor URL parameter changes and execute the callback function on detection.
   *
   * @default true
   */
  watch?: boolean
}): {
  /**
   * Ref that contains the current `SelectQueryBuilderParams`.
   */
  params: Ref<Omit<SelectQueryBuilderParams, 'select' | 'groupBy' | 'offset' | 'limit' | 'populate'>>

  /**
   * Synchronizes the current `params` with the URL query parameters by updating the browser's URL.
   *
   * The `replace` parameter determines whether the operation should replace the current history state.
   * By default, the operation adds a new history state.
   */
  push: (replace?: boolean) => void

  /**
   * Triggers a data refresh operation by executing the callback function with the current URL query parameters.
   *
   * The operation is skipped if the URL query parameters have not changed since the last refresh.
   * The `force` parameter can be used to force a refresh operation even if the URL query parameters have not changed.
   * By default, the operation is not forced.
   *
   * @returns a `Promise` that resolves when the refresh operation is complete.
   */
  refresh: (force?: boolean) => Promise<void>
} {
  const route = useRoute()
  const defaultParams = options.defaultParams ?? { page: 1, perPage: 50 }
  const stringifiedDefaultParams = Object.fromEntries(
    selectQueryBuilderParamsToQueryString(defaultParams)
      .split('&')
      .filter(Boolean)
      .map((param) => {
        const parts = param.split('=')
        return [parts.shift()!, parts.join('=')].map(decodeQueryString)
      }),
  )
  const params = ref<SelectQueryBuilderParams>(deepClone(defaultParams))
  const hideDefaultParams = options.hideDefaultParams ?? true
  let prevQueryString: string | undefined

  function push(replace = false) {
    const p: Record<string, any> = omit({ ...defaultParams, ...route.query, ...params.value }, [
      'select',
      'groupBy',
      'offset',
      'limit',
      'populate',
    ])
    const selectParams = ['where', 'orderBy', 'perPage', 'page']

    const pOther = omit(p, selectParams)
    const pSelect = Object.fromEntries(
      selectQueryBuilderParamsToQueryString(p)
        .split('&')
        .filter(Boolean)
        .map((param) => {
          const parts = param.split('=')
          return [parts.shift()!, decodeQueryString(parts.join('='))].map(decodeQueryString)
        }),
    )
    const query: Record<string, any> = { ...pOther, ...pSelect }

    if (hideDefaultParams) {
      for (const [key, value] of Object.entries(stringifiedDefaultParams)) {
        if (query[key] === value) {
          delete query[key]
        }
      }
    }

    nextTick(() => navigateTo({ query, replace }))
  }

  async function refresh(force = false) {
    const queryString = selectQueryBuilderParamsToQueryString(params.value)
    if (prevQueryString !== queryString || force) {
      prevQueryString = queryString
      await options.callback({ queryString, params: params.value })
    }
  }

  if (options.watch !== false) {
    watch(
      () => route.query,
      async () => {
        params.value = queryStringToSelectQueryBuilderParams(
          Object.entries(
            omit({ ...stringifiedDefaultParams, ...(route.query as any) }, [
              'select',
              'groupBy',
              'offset',
              'limit',
              'populate',
            ]),
          )
            .map(([key, value]) => `${key}=${value}`)
            .join('&'),
        )

        await refresh()
      },
      { immediate: options.init !== false },
    )
  }

  if (options.init !== false) {
    push(true)
  }

  return { params, push, refresh }
}
