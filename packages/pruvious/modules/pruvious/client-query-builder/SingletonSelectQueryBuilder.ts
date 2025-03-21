import { primaryLanguage } from '#pruvious/client/i18n'
import type { LanguageCode, Singletons } from '#pruvious/server'
import type {
  DefaultQueryBuilderParamsOptions,
  ExtractCastedTypes,
  ExtractPopulatedTypes,
  QueryBuilderResult,
  SelectQueryBuilderParamsOptions,
} from '@pruvious/orm'
import {
  normalizeQueryString,
  queryStringToSelectQueryBuilderParams,
  selectQueryBuilderParamsToQueryString,
} from '@pruvious/orm/query-string'
import { defu, isDefined, isUndefined, slugify, toArray, uniqueArray, type NonEmptyArray } from '@pruvious/utils'
import { pruviousGet } from '../api/utils.client'
import type { SingletonQueryBuilderParamsOptions } from '../singletons/SingletonBaseQueryBuilder'
import type { QueryBuilderOptions } from './QueryBuilder'

/**
 * A utility class for constructing and querying singletons through the GET singletons API in a type-safe manner.
 * This class is designed for client-side code and only works for singletons that have the `api.read` setting enabled.
 *
 * @example
 * ```ts
 * const themeOptions = await new SingletonSelectQueryBuilder('ThemeOptions')
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
 * const failedSelect = await new SingletonSelectQueryBuilder('ThemeOptions')
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
export class SingletonSelectQueryBuilder<
  const TSingletonName extends keyof Singletons,
  TSingleton extends Singletons[TSingletonName] = Singletons[TSingletonName],
  TSelectedFields extends TSingleton['TFieldNames'] = TSingleton['TFieldNames'],
  TKnownSelectedFields extends boolean = true,
  TPopulateFields extends boolean = false,
> {
  protected options: {
    fetcher: Required<QueryBuilderOptions>['fetcher']
    apiRouteResolver: (singletonName: string, queryString: string) => string
  }
  protected selectedFields: string[] | undefined
  protected languageCode: LanguageCode | null = null
  protected populateFields: boolean = false

  constructor(
    protected singletonName: TSingletonName,
    options?: {
      /**
       * A custom fetcher function to use for fetching data.
       *
       * @default pruviousGet
       */
      fetcher?: QueryBuilderOptions['fetcher']

      /**
       * Resolves the GET path for reading singleton records.
       *
       * @default
       * (singletonName, queryString) => `singletons/${slugify(singletonName)}` + (queryString ? `?${queryString}` : '')
       */
      apiRouteResolver?: (singletonName: string, queryString: string) => string
    },
  ) {
    this.options = defu(options ?? {}, {
      fetcher: pruviousGet,
      apiRouteResolver: (singletonName: string, queryString: string) =>
        `singletons/${slugify(singletonName)}` + (queryString ? `?${queryString}` : ''),
    })
  }

  /**
   * Applies a query string to the current query builder instance.
   *
   * The following query string parameters are supported:
   *
   * - `select` - Comma-separated list of fields to retrieve.
   * - `populate` - Whether to populate related fields.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const themeOptions = await new SingletonSelectQueryBuilder('ThemeOptions')
   *   .fromQueryString('select=logo,copyrightText')
   *   .get()
   *
   * console.log(themeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: 123,
   * //     copyrightText: '© 2025 Example Inc.',
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  fromQueryString(
    queryString: string | URLSearchParams | Record<string, string | string[]>,
    options?: Pick<SelectQueryBuilderParamsOptions<TSingleton['TFieldNames']>, 'select' | 'populate'> &
      DefaultQueryBuilderParamsOptions &
      SingletonQueryBuilderParamsOptions,
  ): SingletonSelectQueryBuilder<TSingletonName, TSingleton, TSelectedFields, false, TPopulateFields> {
    const params = queryStringToSelectQueryBuilderParams(queryString, {
      ...options,
      groupBy: false,
      orderBy: false,
      limit: false,
      offset: false,
      where: false,
    })

    if (params.select) {
      this.selectedFields = params.select.includes('*') ? undefined : params.select
    } else if (options?.withDefaults) {
      this.selectAll()
    }

    if (options?.language !== false) {
      const normalizedQS = normalizeQueryString(queryString)
      if (isDefined(normalizedQS.language)) {
        this.languageCode = normalizedQS.language.trim() || (null as any)
      } else if (options?.withDefaults) {
        this.languageCode = null
      }
    }

    if (isDefined(params.populate)) {
      this.populateFields = params.populate
    } else if (options?.withDefaults) {
      this.clearPopulate()
    }

    return this as any
  }

  /**
   * Generates a query string from the following query builder parameters:
   *
   * - `select` - Comma-separated list of fields to retrieve.
   * - `populate` - Whether to populate related fields.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const queryString = await new SingletonSelectQueryBuilder('ThemeOptions')
   *   .select(['logo', 'copyrightText'])
   *   .toQueryString()
   *
   * console.log(queryString)
   * // 'select=logo,copyrightText'
   * ```
   */
  toQueryString(
    options?: Pick<SelectQueryBuilderParamsOptions<TSingleton['TFieldNames']>, 'select' | 'populate'> &
      DefaultQueryBuilderParamsOptions &
      SingletonQueryBuilderParamsOptions,
  ): string {
    const wd = !!options?.withDefaults

    let queryString = selectQueryBuilderParamsToQueryString(
      {
        select: this.selectedFields ?? (wd ? ['*'] : undefined),
        populate: this.populateFields === true ? this.populateFields : wd ? false : undefined,
      },
      {
        ...options,
        groupBy: false,
        orderBy: false,
        limit: false,
        offset: false,
        where: false,
      },
    )

    if (options?.language !== false) {
      const language = this.languageCode ?? (wd ? primaryLanguage : '')
      if (language) {
        queryString += (queryString ? '&' : '') + `language=${language}`
      }
    }

    return queryString
  }

  /**
   * Clones the current query builder instance.
   */
  clone(): this {
    const clone = new SingletonSelectQueryBuilder(this.singletonName, this.options)

    clone.selectedFields = isUndefined(this.selectedFields) ? undefined : [...this.selectedFields]
    clone.languageCode = this.languageCode
    clone.populateFields = this.populateFields

    return clone as any
  }

  /**
   * Specifies the `fields` to be retrieved from the query result.
   *
   * This method will override any previous field selection.
   *
   * @example
   * ```ts
   * const themeOptions = await new SingletonSelectQueryBuilder('ThemeOptions')
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
   * ```
   */
  select<TSelectedFields extends TSingleton['TFieldNames']>(
    fields: NonEmptyArray<TSelectedFields>,
  ): SingletonSelectQueryBuilder<TSingletonName, TSingleton, TSelectedFields, true, TPopulateFields>
  select<TSelectedFields extends TSingleton['TFieldNames']>(
    field: TSelectedFields,
  ): SingletonSelectQueryBuilder<TSingletonName, TSingleton, TSelectedFields, true, TPopulateFields>
  select<TSelectedFields extends TSingleton['TFieldNames']>(fields: NonEmptyArray<TSelectedFields> | TSelectedFields) {
    this.selectedFields = uniqueArray(toArray(fields))
    return this as SingletonSelectQueryBuilder<TSingletonName, TSingleton, TSelectedFields, true, TPopulateFields>
  }

  /**
   * Selects all fields from the singleton.
   *
   * This method will override any previous field selection.
   *
   * @example
   * ```ts
   * const themeOptions = await new SingletonSelectQueryBuilder('ThemeOptions')
   *   .selectAll()
   *   .get()
   *
   * console.log(themeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: 123,
   * //     primaryColor: '#ff0000',
   * //     secondaryColor: '#00ff00',
   * //     ...
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  selectAll(): SingletonSelectQueryBuilder<
    TSingletonName,
    TSingleton,
    TSingleton['TFieldNames'],
    true,
    TPopulateFields
  > {
    this.selectedFields = undefined
    return this as any
  }

  /**
   * Specifies which translation of the singleton content should be retrieved.
   * If not set, content in the primary language will be returned.
   * Only works for singletons that have translations enabled.
   */
  language<TLanguageCode extends TSingleton['translatable'] extends true ? LanguageCode : never>(
    languageCode: TLanguageCode,
  ): SingletonSelectQueryBuilder<TSingletonName, TSingleton, TSelectedFields, TKnownSelectedFields, TPopulateFields> {
    this.languageCode = languageCode as any
    return this
  }

  /**
   * Specifies that the query should return populated field values.
   * Field populators transform the field value into a format suitable for application use.
   * They can retrieve related data from the database, format the value, or perform other operations.
   *
   * @example
   * ```ts
   * const themeOptions = await new SingletonSelectQueryBuilder('ThemeOptions')
   *   .select(['logo', 'copyrightText'])
   *   .populate()
   *   .get()
   *
   * console.log(themeOptions)
   * // {
   * //   success: true,
   * //   data: {
   * //     logo: {
   * //       // @todo populated image data
   * //     },
   * //     copyrightText: '© 2025 Example Inc.',
   * //   },
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  populate(): SingletonSelectQueryBuilder<TSingletonName, TSingleton, TSelectedFields, TKnownSelectedFields, true> {
    this.populateFields = true
    return this as any
  }

  /**
   * Disables field population for the query.
   * The query will return casted field values without executing any field populators.
   *
   * @example
   * ```ts
   * new SingletonSelectQueryBuilder('ThemeOptions')
   *   .select(['logo', 'copyrightText'])
   *   .populate()      // This will be ignored
   *   .clearPopulate() // This will disable field population
   *   .get()
   * ```
   */
  clearPopulate(): SingletonSelectQueryBuilder<
    TSingletonName,
    TSingleton,
    TSelectedFields,
    TKnownSelectedFields,
    false
  > {
    this.populateFields = true
    return this as any
  }

  /**
   * Retrieves the singleton data from the API.
   *
   * @example
   * ```ts
   * const themeOptions = await new SingletonSelectQueryBuilder('ThemeOptions')
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
   * ```
   */
  async get(): Promise<
    QueryBuilderResult<
      TKnownSelectedFields extends false
        ? Partial<
            TPopulateFields extends true
              ? ExtractPopulatedTypes<TSingleton['fields']>
              : ExtractCastedTypes<TSingleton['fields']>
          > &
            Record<string, any>
        : Pick<
            TPopulateFields extends true
              ? ExtractPopulatedTypes<TSingleton['fields']>
              : ExtractCastedTypes<TSingleton['fields']>,
            TSelectedFields & keyof TSingleton['fields']
          >,
      undefined
    >
  > {
    const response = await this.options.fetcher(
      this.options.apiRouteResolver(this.singletonName, this.toQueryString()),
      {},
    )

    if (response.success) {
      return {
        success: true,
        data: response.data,
        runtimeError: undefined,
        inputErrors: undefined,
      }
    } else {
      return {
        success: false,
        data: undefined,
        runtimeError: response.error.message,
        inputErrors: undefined,
      }
    }
  }
}
