import { __, pruviousError, type SingletonAPI, type Singletons } from '#pruvious/server'
import { isDefined, isString, kebabCase } from '@pruvious/utils'
import { SingletonSelectQueryBuilder } from './SingletonSelectQueryBuilder'
import { SingletonUpdateQueryBuilder } from './SingletonUpdateQueryBuilder'
import type { GenericSingleton } from './define'
import { singletonGuards } from './guards'

let singletonSlugMap: Record<string, { name: keyof Singletons; definition: GenericSingleton }>

/**
 * Creates a `SingletonSelectQueryBuilder` for a specific `singleton`.
 *
 * @see https://pruvious.com/docs/query-builder#select-singleton (@todo set up this link)
 *
 * @example
 * ```ts
 * import { selectSingleton } from '#pruvious/server'
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
export function selectSingleton<const TSingletonName extends SingletonAPI['any']['read']>(
  name: TSingletonName,
): SingletonSelectQueryBuilder<TSingletonName> {
  return new SingletonSelectQueryBuilder(name)
}

/**
 * Creates a `SingletonSelectQueryBuilder` for a specific `singleton` that includes permission checks.
 * Applies singleton and field guards to ensure that only authorized users can select data from the database.
 *
 * @see https://pruvious.com/docs/query-builder#guarded-select-singleton (@todo set up this link)
 *
 * @example
 * ```ts
 * import { guardedSelectSingleton } from '#pruvious/server'
 *
 * const themeOptions = await guardedSelectSingleton('ThemeOptions')
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
 * const failedSelect = await guardedSelectSingleton('ThemeOptions')
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
export function guardedSelectSingleton<const TSingletonName extends SingletonAPI['any']['read']>(
  name: TSingletonName,
): SingletonSelectQueryBuilder<TSingletonName> {
  return new SingletonSelectQueryBuilder(name).prepare(singletonGuards())
}

/**
 * Creates a `SingletonUpdateQueryBuilder` for a specific `singleton`.
 *
 * @see https://pruvious.com/docs/query-builder#update-singleton (@todo set up this link)
 *
 * @example
 * ```ts
 * import { updateSingleton } from '#pruvious/server'
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
export function updateSingleton<const TSingletonName extends SingletonAPI['any']['update']>(
  name: TSingletonName,
): SingletonUpdateQueryBuilder<TSingletonName> {
  return new SingletonUpdateQueryBuilder(name)
}

/**
 * Creates a `SingletonUpdateQueryBuilder` for a specific `singleton` that includes permission checks.
 * Applies singleton and field guards to ensure that only authorized users can update data in the database.
 *
 * @see https://pruvious.com/docs/query-builder#guarded-update-singleton (@todo set up this link)
 *
 * @example
 * ```ts
 * import { guardedUpdateSingleton } from '#pruvious/server'
 *
 * const updatedThemeOptions = await guardedUpdateSingleton('ThemeOptions')
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
 * const failedUpdate = await guardedUpdateSingleton('ThemeOptions')
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
export function guardedUpdateSingleton<const TSingletonName extends SingletonAPI['any']['update']>(
  name: TSingletonName,
): SingletonUpdateQueryBuilder<TSingletonName> {
  return new SingletonUpdateQueryBuilder(name).prepare(singletonGuards())
}

/**
 * Retrieves a singleton object containing its name and definition using its URL path identifier (`slug`).
 * If the singleton does not exist, a `404` error is thrown and the current event handler is halted.
 *
 * The singleton `slug` is a URL-safe version of the singleton name in kebab-case format.
 * For example, a singleton named `ThemeOptions` will have a slug of `theme-options`.
 *
 * @returns n object containing the singleton name and its definition.
 * @throws a `404` H3 error if the singleton does not exist, halting any subsequent code execution in the current event handler.
 */
export async function getSingletonBySlug<T extends string | undefined>(
  slug: T,
): Promise<{ name: keyof Singletons; definition: GenericSingleton }> {
  if (!singletonSlugMap) {
    const { singletons } = await import('#pruvious/server')

    singletonSlugMap = {}

    for (const [name, collection] of Object.entries(singletons)) {
      const slug = kebabCase(name)
      singletonSlugMap[slug] = { name: name, definition: collection } as any
    }
  }

  if (slug && singletonSlugMap[slug]) {
    return singletonSlugMap[slug]
  }

  throw pruviousError(null, {
    statusCode: 404,
    message: __('pruvious-api', 'Singleton not found'),
  })
}

/**
 * Retrieves a singleton object containing its name and definition from the current HTTP event context.
 * If the singleton does not exist, a `404` error is thrown and the current event handler is halted.
 *
 * @returns an object containing the singleton name and its definition.
 * @throws a `404` H3 error if the singleton does not exist, halting any subsequent code execution in the current event handler.
 */
export async function getSingletonFromEvent(): Promise<{ name: keyof Singletons; definition: GenericSingleton }> {
  const event = useEvent()
  const routerParams = getRouterParams(event)
  let singletonSlug: string | undefined

  if (isDefined(routerParams.singleton)) {
    singletonSlug = routerParams.singleton
  } else {
    const apiBasePath = useRuntimeConfig().pruvious.api.basePath
    const basePathParts = [...apiBasePath.split('/').filter(Boolean), 'singletons']
    const pathParts = event.path.split('/').filter(Boolean)

    let match = true
    let i = 0

    for (const basePathPart of basePathParts) {
      if (basePathPart !== pathParts[i++]) {
        match = false
        break
      }
    }

    if (match && isString(pathParts[i])) {
      singletonSlug = pathParts[i]!.split('?')[0]
    }
  }

  return getSingletonBySlug(singletonSlug)
}
