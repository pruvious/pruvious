import Env from '@ioc:Adonis/Core/Env'
import Database from '@ioc:Adonis/Lucid/Database'
import { ModelQueryBuilderContract } from '@ioc:Adonis/Lucid/Orm'
import {
  AndFilter,
  ColumnRecords,
  Filter,
  isFilterableField,
  isSortableField,
  OrFilter,
  Pagination,
  parseQueryString,
  QueryableField,
  QueryStringParameters,
  QueryTable,
} from '@pruvious-test/shared'
import { camelize, camelToSnake, isNumeric, uniqueArray } from '@pruvious-test/utils'
import { config } from 'App/imports'
import Page from 'App/Models/Page'
import PageMeta from 'App/Models/PageMeta'
import Post from 'App/Models/Post'
import Preset from 'App/Models/Preset'
import Role from 'App/Models/Role'
import Upload from 'App/Models/Upload'
import User from 'App/Models/User'
import { getTranslations, LanguageType } from 'App/translations'
import { DateTime } from 'luxon'

export class BaseQuery<
  T extends {
    Input: Record<string, any>
    Result: Record<string, any>
    PopulatedResult: Record<string, any>
    ComputedField: string
    SelectableField: string
    SortableField: string
    FilterableField: string
    StringField: string
    NumberField: string
    BooleanField: string
    LanguageCode: string
  },
> {
  protected driver = Env.get('DB_CONNECTION')

  protected table: QueryTable

  protected query: ModelQueryBuilderContract<any, any>

  protected columns: ColumnRecords = {}

  protected metaColumns: ColumnRecords = {}

  protected fields: QueryableField[] = []

  protected selectedColumns: Set<string> = new Set()

  protected selectedMetaColumns: Set<string> = new Set()

  protected keywordSelects: any[] = []

  protected aliasedMetaColumns: Set<string> = new Set()

  protected translatable: boolean = true

  protected _language: string

  protected relations: T['ComputedField'][] = []

  protected loadRelations: Set<T['ComputedField']> = new Set()

  protected populateFields: boolean = false

  protected _skipPopulate?: {
    pageIds?: number[]
    presetIds?: number[]
    postIds?: number[]
    roleIds?: number[]
    uploadIds?: number[]
    userIds?: number[]
  }

  protected prepared: boolean = false

  protected page: number = 1

  protected perPage: number = 50

  protected perPageLimit: number = 50

  protected createHook?: (record: Record<string, any>) => Promise<void> | void

  protected readHook?: (record: Record<string, any>) => Promise<void> | void

  protected populateHook?: (record: Record<string, any>) => Promise<void> | void

  protected updateHook?: (record: Record<string, any>) => Promise<void> | void

  protected deleteHook?: (recordId: number) => Promise<void> | void

  get diagnostics() {
    return uniqueArray(this._diagnostics)
  }
  protected _diagnostics: string[] = []

  fromQueryString(value: string): this {
    const { params, diagnostics } = parseQueryString(value)
    this._diagnostics.push(...diagnostics)
    return this.apply(params)
  }

  apply(
    params: QueryStringParameters<{
      LanguageCode: T['LanguageCode']
      Model: T['Input']
      SelectableField: T['SelectableField']
      SortableField: T['SortableField']
      FilterableField: T['FilterableField']
      StringField: T['StringField']
      NumberField: T['NumberField']
      BooleanField: T['BooleanField']
    }>,
  ): this {
    if (params.filters) {
      this.query = this.filter([params.filters as any], this.query)
    }

    if (params.search) {
      this.search(params.search).orderBySearchScore()
    }

    params.sort?.forEach((item) => this.orderBy(item.field, item.direction))

    if (params.fields) {
      this.select(...params.fields.map((field) => field.split(':')[0]))
    }

    if (params.language) {
      if (this.translatable) {
        this.setLanguage(params.language)
      } else {
        this._diagnostics.push('Model is not translatable')
      }
    }

    if (params.perPage) {
      this.perPage = params.perPage
    }

    if (params.page) {
      this.page = params.page
    }

    return this
  }

  protected parseQueryString(_input: string | QueryStringParameters): {
    params: QueryStringParameters
    diagnostics: string[]
  } {
    return { params: {}, diagnostics: [] }
  }

  protected setLanguage(code: string): this {
    if (code === '*' || config.languages!.some((language) => language.code === code)) {
      this._language = code
    } else {
      this._diagnostics.push(`Language code '${code}' is not defined`)
    }

    return this
  }

  select(...fields: (T['SelectableField'] | '*')[]): this {
    if (fields.includes('*')) {
      fields = [...Object.keys(this.columns), ...Object.keys(this.metaColumns)]
    }

    fields.forEach((field) => {
      const selectable = this.isSelectable(field)

      if (selectable === false) {
        this._diagnostics.push(`Field '${field}' is not selectable`)
      } else {
        if (this.columns[field]) {
          this.selectedColumns.add(field)
        } else if (this.metaColumns[field]) {
          this.selectedMetaColumns.add(field)
        } else {
          this._diagnostics.push(`Field '${field}' does not exist`)
        }
      }
    })

    return this
  }

  protected isSelectable(fieldName: string): boolean | null {
    const field = this.fields.find((field) => field.name === fieldName)

    if (field) {
      return field.selectable !== false
    }

    return null
  }

  protected isSortable(fieldName: string): boolean | null {
    const field = this.fields.find((field) => field.name === fieldName)
    return field ? isSortableField(field) : null
  }

  protected isFilterable(fieldName: string): boolean | null {
    const field = this.fields.find((field) => field.name === fieldName)
    return field ? isFilterableField(field) : null
  }

  protected filter(
    filters: (Record<string, Filter> | OrFilter | AndFilter)[],
    query: ModelQueryBuilderContract<any, any>,
    relation: 'or' | 'and' = 'and',
  ): ModelQueryBuilderContract<any, any> {
    filters.forEach((item) => {
      if (item['$or']) {
        if (Array.isArray(item['$or'])) {
          query = query[`${relation}Where`]((subQuery) => {
            subQuery = this.filter(item['$or'], subQuery, 'or')
          })
        } else {
          this._diagnostics.push("The '$or' filter must be an array")
        }
      } else if (item['$and']) {
        if (Array.isArray(item['$and'])) {
          query = query[`${relation}Where`]((subQuery) => {
            subQuery = this.filter(item['$and'], subQuery, 'and')
          })
        } else {
          this._diagnostics.push("The '$and' filter must be an array")
        }
      } else {
        Object.entries(item).forEach(([field, filter]: [string, Filter], i) => {
          const _relation = i === 0 ? relation : 'and'

          for (const type in filter) {
            if (type === '$eq') {
              query = this.$where('', _relation, field, filter['$eq'], query)
            } else if (type === '$eqi') {
              query = this.$where('Like', _relation, field, filter['$eqi'], query)
            } else if (type === '$ne') {
              query = this.$where('Not', _relation, field, filter['$ne'], query)
            } else if (type === '$lt') {
              query = this.$where('LessThan', _relation, field, filter['$lt'], query)
            } else if (type === '$lte') {
              query = this.$where('LessThanEqual', _relation, field, filter['$lte'], query)
            } else if (type === '$gt') {
              query = this.$where('GreaterThan', _relation, field, filter['$gt'], query)
            } else if (type === '$gte') {
              query = this.$where('GreaterThanEqual', _relation, field, filter['$gte'], query)
            } else if (type === '$in') {
              query = this.$where('In', _relation, field, filter['$in'], query)
            } else if (type === '$notIn') {
              query = this.$where('NotIn', _relation, field, filter['$notIn'], query)
            } else if (type === '$null') {
              query = this.$where('Null', _relation, field, filter['$null'], query)
            } else if (type === '$notNull') {
              query = this.$where('NotNull', _relation, field, filter['$notNull'], query)
            } else if (type === '$between') {
              query = this.$where('Between', _relation, field, filter['$between'], query)
            } else if (type === '$startsWith') {
              query = this.$where('Like', _relation, field, `${filter['$startsWith']}%`, query)
            } else if (type === '$endsWith') {
              query = this.$where('Like', _relation, field, `%${filter['$endsWith']}`, query)
            } else if (type === '$contains') {
              query = this.$where('Like', _relation, field, `%${filter['$contains']}%`, query)
            } else {
              this._diagnostics.push(`Invalid filter '${type}'`)
            }
          }
        })
      }
    })

    return query
  }

  where<
    FieldName extends T['FilterableField'] &
      (T['StringField'] | T['NumberField'] | T['BooleanField']),
  >(field: FieldName, value: Exclude<T['Input'][FieldName], null>): this {
    this.query = this.$where('', 'and', field, value, this.query)
    return this
  }

  andWhere<
    FieldName extends T['FilterableField'] &
      (T['StringField'] | T['NumberField'] | T['BooleanField']),
  >(field: FieldName, value: Exclude<T['Input'][FieldName], null>): this {
    return this.where(field, value)
  }

  /**
   * The orWhere method is used to define the `or where` clause in SQL queries.
   *
   * @example
   * ```js
   * await queryPages().where('title', '').orWhere('description', '').all()
   * // Returns pages with an empty title or description
   * ```
   */
  orWhere<
    FieldName extends T['FilterableField'] &
      (T['StringField'] | T['NumberField'] | T['BooleanField']),
  >(field: FieldName, value: Exclude<T['Input'][FieldName], null>): this {
    this.query = this.$where('', 'or', field, value, this.query)
    return this
  }

  /**
   * The whereNot method is used to define the `where not` clause in SQL
   * queries.
   *
   * @example
   * ```js
   * await queryPages().whereNot('path', '').all()
   * // Returns all pages except the homepage
   * ```
   */
  whereNot<
    FieldName extends T['FilterableField'] &
      (T['StringField'] | T['NumberField'] | T['BooleanField']),
  >(field: FieldName, value: Exclude<T['Input'][FieldName], null>): this {
    this.query = this.$where('Not', 'and', field, value, this.query)
    return this
  }

  /**
   * The andWhereNot method is used to define the `and where not` clause in SQL
   * queries.
   *
   * @alias whereNot
   * @example
   * ```js
   * await queryPages().where('path', '').andWhereNot('public', true).first()
   * // Returns the homepage, if not published
   * ```
   */
  andWhereNot<
    FieldName extends T['FilterableField'] &
      (T['StringField'] | T['NumberField'] | T['BooleanField']),
  >(field: FieldName, value: Exclude<T['Input'][FieldName], null>): this {
    return this.whereNot(field, value)
  }

  /**
   * The orWhereNot method is used to define the `or where not` clause in SQL
   * queries.
   *
   * @example
   * ```js
   * await queryPages().where('title', '').orWhereNot('description', '').all()
   * // Returns pages with an empty title and non-empty description
   * ```
   */
  orWhereNot<
    FieldName extends T['FilterableField'] &
      (T['StringField'] | T['NumberField'] | T['BooleanField']),
  >(field: FieldName, value: Exclude<T['Input'][FieldName], null>): this {
    this.query = this.$where('Not', 'or', field, value, this.query)
    return this
  }

  /**
   * Add a `where like` clause with case-insensitive substring comparison on a
   * given `field` with a given `value`.
   *
   * @example
   * ```js
   * await queryPages().whereLike('path', 'projects/%').all()
   * // Returns all pages starting with the path `project/`
   * ```
   */
  whereLike<FieldName extends T['FilterableField'] & T['StringField']>(
    field: FieldName,
    value: Exclude<T['Input'][FieldName], null>,
  ): this {
    this.query = this.$where('Like', 'and', field, value, this.query)
    return this
  }

  /**
   * Add an `and where like` clause with case-insensitive substring comparison
   * on a given `field` with a given `value`.
   *
   * @alias whereLike
   * @example
   * ```js
   * // @todo
   * ```
   */
  andWhereLike<FieldName extends T['FilterableField'] & T['StringField']>(
    field: FieldName,
    value: Exclude<T['Input'][FieldName], null>,
  ): this {
    return this.whereLike(field, value)
  }

  /**
   * Add an `or where like` clause with case-insensitive substring comparison
   * on a given `field` with a given `value`.
   *
   * @example
   * ```js
   * // @todo
   * ```
   */
  orWhereLike<FieldName extends T['FilterableField'] & T['StringField']>(
    field: FieldName,
    value: Exclude<T['Input'][FieldName], null>,
  ): this {
    this.query = this.$where('Like', 'or', field, value, this.query)
    return this
  }

  /**
   * Add a `where` clause with a `<` operator on a given `field` with a given
   * `value`.
   *
   * @example
   * ```js
   * await queryPages().whereLt('createdAt', '2023-01-01').all()
   * // Returns pages created before the year 2023
   * ```
   */
  whereLt<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    value: Exclude<T['Input'][FieldName], null>,
  ): this {
    this.query = this.$where('LessThan', 'and', field, value, this.query)
    return this
  }

  /**
   * Add an `and where` clause with a `<` operator on a given `field` with a
   * given `value`.
   *
   * @alias whereLt
   * @example
   * ```js
   * // @todo
   * ```
   */
  andWhereLt<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    value: Exclude<T['Input'][FieldName], null>,
  ): this {
    return this.whereLt(field, value)
  }

  /**
   * Add an `or where` clause with a `<` operator on a given `field` with a
   * given `value`.
   *
   * @example
   * ```js
   * // @todo
   * ```
   */
  orWhereLt<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    value: Exclude<T['Input'][FieldName], null>,
  ): this {
    this.query = this.$where('LessThan', 'or', field, value, this.query)
    return this
  }

  /**
   * Add a `where` clause with a `<=` operator on a given `field` with a given
   * `value`.
   *
   * @example
   * ```js
   * await queryPages().whereLte('id', 10).all()
   * // Returns pages with the IDs from 1 to 10
   * ```
   */
  whereLte<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    value: Exclude<T['Input'][FieldName], null>,
  ): this {
    this.query = this.$where('LessThanEqual', 'and', field, value, this.query)
    return this
  }

  /**
   * Add an `and where` clause with a `<=` operator on a given `field` with a
   * given `value`.
   *
   * @alias whereLte
   * @example
   * ```js
   * // @todo
   * ```
   */
  andWhereLte<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    value: Exclude<T['Input'][FieldName], null>,
  ): this {
    return this.whereLte(field, value)
  }

  /**
   * Add an `or where` clause with a `<=` operator on a given `field` with a
   * given `value`.
   *
   * @example
   * ```js
   * // @todo
   * ```
   */
  orWhereLte<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    value: Exclude<T['Input'][FieldName], null>,
  ): this {
    this.query = this.$where('LessThanEqual', 'or', field, value, this.query)
    return this
  }

  /**
   * Add a `where` clause with a `>` operator on a given `field` with a given
   * `value`.
   *
   * @example
   * ```js
   * await queryPages().whereGt('id', 10).all()
   * // Returns pages with the IDs 11, 12, ...
   * ```
   */
  whereGt<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    value: Exclude<T['Input'][FieldName], null>,
  ): this {
    this.query = this.$where('GreaterThan', 'and', field, value, this.query)
    return this
  }

  /**
   * Add an `and where` clause with a `>` operator on a given `field` with a
   * given `value`.
   *
   * @alias whereGt
   * @example
   * ```js
   * // @todo
   * ```
   */
  andWhereGt<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    value: Exclude<T['Input'][FieldName], null>,
  ): this {
    return this.whereGt(field, value)
  }

  /**
   * Add an `or where` clause with a `>` operator on a given `field` with a
   * given `value`.
   *
   * @example
   * ```js
   * // @todo
   * ```
   */
  orWhereGt<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    value: Exclude<T['Input'][FieldName], null>,
  ): this {
    this.query = this.$where('GreaterThan', 'or', field, value, this.query)
    return this
  }

  /**
   * Add a `where` clause with a `>=` operator on a given `field` with a given
   * `value`.
   *
   * @example
   * ```js
   * await queryPages().whereGte('createdAt', '2023-01-01').all()
   * // Returns pages created after the year 2022
   * ```
   */
  whereGte<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    value: Exclude<T['Input'][FieldName], null>,
  ): this {
    this.query = this.$where('GreaterThanEqual', 'and', field, value, this.query)
    return this
  }

  /**
   * Add an `and where` clause with a `>=` operator on a given `field` with a
   * given `value`.
   *
   * @alias whereGte
   * @example
   * ```js
   * // @todo
   * ```
   */
  andWhereGte<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    value: Exclude<T['Input'][FieldName], null>,
  ): this {
    return this.whereGte(field, value)
  }

  /**
   * Add an `or where` clause with a `>=` operator on a given `field` with a
   * given `value`.
   *
   * @example
   * ```js
   * // @todo
   * ```
   */
  orWhereGte<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    value: Exclude<T['Input'][FieldName], null>,
  ): this {
    this.query = this.$where('GreaterThanEqual', 'or', field, value, this.query)
    return this
  }

  /**
   * The whereBetween method adds the `where between` clause. It accepts the
   * `field` name as the first argument and a `tuple` of [min, max] values as
   * the second argument.
   *
   * @example
   * ```js
   * await queryPages().whereBetween('id', [1, 10]).all()
   * // Returns pages with IDs between 1 and 10
   *
   * await queryPages().whereBetween('createdAt', ['2023-01-01', '2023-12-31']).all()
   * // Returns pages created in the year 2023
   * ```
   */
  whereBetween<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    values: [Exclude<T['Input'][FieldName], null>, Exclude<T['Input'][FieldName], null>],
  ): this {
    this.query = this.$where('Between', 'and', field, values, this.query)
    return this
  }

  /**
   * The andWhereBetween method adds the `and where between` clause. It accepts
   * the `field` name as the first argument and a `tuple` of [min, max] values
   * as the second argument.
   *
   * @alias whereBetween
   * @example
   * ```js
   * // @todo
   * ```
   */
  andWhereBetween<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    values: [Exclude<T['Input'][FieldName], null>, Exclude<T['Input'][FieldName], null>],
  ): this {
    return this.whereBetween(field, values)
  }

  /**
   * The orWhereBetween method adds the `or where between` clause. It accepts
   * the `field` name as the first argument and a `tuple` of [min, max] values
   * as the second argument.
   *
   * @example
   * ```js
   * // @todo
   * ```
   */
  orWhereBetween<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    values: [Exclude<T['Input'][FieldName], null>, Exclude<T['Input'][FieldName], null>],
  ): this {
    this.query = this.$where('Between', 'or', field, values, this.query)
    return this
  }

  /**
   * The whereIn method is used to define the `where in` SQL clause. The method
   * accepts the `field` name as the first argument and an array of `values` as
   * the second argument.
   *
   * @example
   * ```js
   * await queryPages().whereIn('id', [1, 2, 3]).all()
   * // Returns pages with the IDs 1, 2, and 3
   * ```
   */
  whereIn<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    values: Exclude<T['Input'][FieldName], null>[],
  ): this {
    this.query = this.$where('In', 'and', field, values, this.query)
    return this
  }

  /**
   * The andWhereIn method is used to define the `and where in` SQL clause. The
   * method accepts the `field` name as the first argument and an array of
   * `values` as the second argument.
   *
   * @alias whereIn
   * @example
   * ```js
   * // @todo
   * ```
   */
  andWhereIn<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    values: Exclude<T['Input'][FieldName], null>[],
  ): this {
    return this.whereIn(field, values)
  }

  /**
   * The orWhereIn method is used to define the `or where in` SQL clause. The
   * method accepts the `field` name as the first argument and an array of
   * `values` as the second argument.
   *
   * @example
   * ```js
   * // @todo
   * ```
   */
  orWhereIn<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    values: Exclude<T['Input'][FieldName], null>[],
  ): this {
    this.query = this.$where('In', 'or', field, values, this.query)
    return this
  }

  /**
   * The whereNotIn method is used to define the `where not in` SQL clause. The
   * method accepts the `field` name as the first argument and an array of
   * `values` as second argument.
   *
   * @example
   * ```js
   * await queryPages().whereNotIn('id', [1, 2, 3]).all()
   * // Returns pages not having the IDs 1, 2, and 3
   * ```
   */
  whereNotIn<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    values: Exclude<T['Input'][FieldName], null>[],
  ): this {
    this.query = this.$where('NotIn', 'and', field, values, this.query)
    return this
  }

  /**
   * The andWhereNotIn method is used to define the `and where not in` SQL
   * clause. The method accepts the `field` name as the first argument and an
   * array of `values` as second argument.
   *
   * @alias whereNotIn
   * @example
   * ```js
   * // @todo
   * ```
   */
  andWhereNotIn<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    values: Exclude<T['Input'][FieldName], null>[],
  ): this {
    return this.whereNotIn(field, values)
  }

  /**
   * The orWhereNotIn method is used to define the `or where not in` SQL
   * clause. The method accepts the `field` name as the first argument and an
   * array of `values` as second argument.
   *
   * @example
   * ```js
   * // @todo
   * ```
   */
  orWhereNotIn<FieldName extends T['FilterableField'] & (T['StringField'] | T['NumberField'])>(
    field: FieldName,
    values: Exclude<T['Input'][FieldName], null>[],
  ): this {
    this.query = this.$where('NotIn', 'or', field, values, this.query)
    return this
  }

  /**
   * The whereNull method adds a `where is null` clause to the query.
   *
   * @example
   * ```js
   * await queryPages().whereNull('publishDate').all()
   * // Returns pages that have never been published
   * ```
   */
  whereNull<FieldName extends T['FilterableField']>(field: FieldName): this {
    this.query = this.$where('Null', 'and', field, true, this.query)
    return this
  }

  /**
   * The andWhereNull method adds a `and where is null` clause to the query.
   *
   * @alias whereNull
   * @example
   * ```js
   * // @todo
   * ```
   */
  andWhereNull<FieldName extends T['FilterableField']>(field: FieldName): this {
    return this.whereNull(field)
  }

  /**
   * The orWhereNull method adds a `or where is null` clause to the query.
   *
   * @example
   * ```js
   * // @todo
   * ```
   */
  orWhereNull<FieldName extends T['FilterableField']>(field: FieldName): this {
    this.query = this.$where('Null', 'or', field, true, this.query)
    return this
  }

  /**
   * The whereNotNull method adds a `where is not null` clause to the query.
   *
   * @example
   * ```js
   * await queryPages().whereNotNull('publishDate').all()
   * // Returns pages that have been published once
   * ```
   */
  whereNotNull<FieldName extends T['FilterableField']>(field: FieldName): this {
    this.query = this.$where('NotNull', 'and', field, true, this.query)
    return this
  }

  /**
   * The andWhereNotNull method adds a `and where is not null` clause to the
   * query.
   *
   * @alias whereNotNull
   * @example
   * ```js
   * // @todo
   * ```
   */
  andWhereNotNull<FieldName extends T['FilterableField']>(field: FieldName): this {
    return this.whereNotNull(field)
  }

  /**
   * The orWhereNotNull method adds a `or where is not null` clause to the
   * query.
   *
   * @example
   * ```js
   * // @todo
   * ```
   */
  orWhereNotNull<FieldName extends T['FilterableField']>(field: FieldName): this {
    this.query = this.$where('NotNull', 'or', field, true, this.query)
    return this
  }

  protected $where(
    method:
      | ''
      | 'Not'
      | 'Like'
      | 'LessThan'
      | 'LessThanEqual'
      | 'GreaterThan'
      | 'GreaterThanEqual'
      | 'Between'
      | 'In'
      | 'NotIn'
      | 'Null'
      | 'NotNull',
    relation: 'or' | 'and',
    field: string,
    value: any,
    query: ModelQueryBuilderContract<any, any>,
  ): ModelQueryBuilderContract<any, any> {
    if (this.isFilterable(field) === false) {
      this._diagnostics.push(`Field '${field}' is not filterable`)
    } else {
      if (this.metaColumns[field] && this.metaColumns[field] !== 'json') {
        this.aliasedMetaColumns.add(field)
      }

      if (this.columns[field] === 'json' || this.metaColumns[field] === 'json') {
        this._diagnostics.push(`Cannot filter by field '${field}'`)
      } else if (this.columns[field]) {
        const preparedValue = this.prepareValue(value, field)

        if (preparedValue !== undefined) {
          if (method === '' || method === 'Not') {
            query = query[`${relation}Where${method}`](camelToSnake(field), preparedValue)
          } else if (method === 'Like') {
            if (this.columns[field] === 'string') {
              query = query[`${relation}WhereLike`](camelToSnake(field), preparedValue)
            } else {
              this._diagnostics.push(`The 'like' operator cannot be used for field '${field}'`)
            }
          } else if (method === 'LessThan') {
            if (
              this.columns[field] === 'string' ||
              this.columns[field] === 'number' ||
              this.columns[field] === 'dateTime'
            ) {
              query = query[`${relation}Where`](camelToSnake(field), '<', preparedValue)
            } else {
              this._diagnostics.push(`The '<' operator cannot be used for field '${field}'`)
            }
          } else if (method === 'LessThanEqual') {
            if (
              this.columns[field] === 'string' ||
              this.columns[field] === 'number' ||
              this.columns[field] === 'dateTime'
            ) {
              query = query[`${relation}Where`](camelToSnake(field), '<=', preparedValue)
            } else {
              this._diagnostics.push(`The '<=' operator cannot be used for field '${field}'`)
            }
          } else if (method === 'GreaterThan') {
            if (
              this.columns[field] === 'string' ||
              this.columns[field] === 'number' ||
              this.columns[field] === 'dateTime'
            ) {
              query = query[`${relation}Where`](camelToSnake(field), '>', preparedValue)
            } else {
              this._diagnostics.push(`The '>' operator cannot be used for field '${field}'`)
            }
          } else if (method === 'GreaterThanEqual') {
            if (
              this.columns[field] === 'string' ||
              this.columns[field] === 'number' ||
              this.columns[field] === 'dateTime'
            ) {
              query = query[`${relation}Where`](camelToSnake(field), '>=', preparedValue)
            } else {
              this._diagnostics.push(`The '>=' operator cannot be used for field '${field}'`)
            }
          } else if (method === 'Between') {
            if (this.columns[field] === 'number' || this.columns[field] === 'dateTime') {
              if (Array.isArray(value) && value.length === 2) {
                query = query[`${relation}WhereBetween`](camelToSnake(field), [
                  this.prepareValue(field, value[0]),
                  this.prepareValue(field, value[1]),
                ])
              } else {
                this._diagnostics.push("The 'between' value must be a tuple")
              }
            } else {
              this._diagnostics.push(`The 'between' operator cannot be used for field '${field}'`)
            }
          } else if (method === 'In' || method === 'NotIn') {
            if (Array.isArray(value)) {
              query = query[`${relation}Where${method}`](
                camelToSnake(field),
                value.map((v) => this.prepareValue(v, field)).filter((v) => v !== undefined),
              )
            } else {
              this._diagnostics.push("The 'in' value must be an array")
            }
          } else if (method === 'Null' || method === 'NotNull') {
            query = query[`${relation}Where${method}`](camelToSnake(field))
          }
        }
      } else if (this.metaColumns[field]) {
        const preparedValue = this.prepareValue(value, field)

        if (preparedValue !== undefined) {
          query = query[`${relation}WhereHas`](
            'meta',
            (subQuery: ModelQueryBuilderContract<any, any>) => {
              const castedValue =
                this.metaColumns[field] === 'string' ? 'value' : 'cast(value as numeric)'

              if (method === '') {
                subQuery.where('key', field).andWhereRaw(`${castedValue} = ?`, [preparedValue])
              } else if (method === 'Not') {
                subQuery.where('key', field).andWhereRaw(`${castedValue} <> ?`, [preparedValue])
              } else if (method === 'Like') {
                if (this.metaColumns[field] === 'string') {
                  subQuery.where('key', field).andWhereRaw(`${castedValue} like ?`, [preparedValue])
                } else {
                  this._diagnostics.push(`The 'like' operator cannot be used for field '${field}'`)
                }
              } else if (method === 'LessThan') {
                if (
                  this.metaColumns[field] === 'string' ||
                  this.metaColumns[field] === 'number' ||
                  this.metaColumns[field] === 'dateTime'
                ) {
                  subQuery.where('key', field).andWhereRaw(`${castedValue} < ?`, [preparedValue])
                } else {
                  this._diagnostics.push(`The '<' operator cannot be used for field '${field}'`)
                }
              } else if (method === 'LessThanEqual') {
                if (
                  this.metaColumns[field] === 'string' ||
                  this.metaColumns[field] === 'number' ||
                  this.metaColumns[field] === 'dateTime'
                ) {
                  subQuery.where('key', field).andWhereRaw(`${castedValue} <= ?`, [preparedValue])
                } else {
                  this._diagnostics.push(`The '<=' operator cannot be used for field '${field}'`)
                }
              } else if (method === 'GreaterThan') {
                if (
                  this.metaColumns[field] === 'string' ||
                  this.metaColumns[field] === 'number' ||
                  this.metaColumns[field] === 'dateTime'
                ) {
                  subQuery.where('key', field).andWhereRaw(`${castedValue} > ?`, [preparedValue])
                } else {
                  this._diagnostics.push(`The '>' operator cannot be used for field '${field}'`)
                }
              } else if (method === 'GreaterThanEqual') {
                if (
                  this.metaColumns[field] === 'string' ||
                  this.metaColumns[field] === 'number' ||
                  this.metaColumns[field] === 'dateTime'
                ) {
                  subQuery.where('key', field).andWhereRaw(`${castedValue} >= ?`, [preparedValue])
                } else {
                  this._diagnostics.push(`The '>=' operator cannot be used for field '${field}'`)
                }
              } else if (method === 'Between') {
                if (
                  this.metaColumns[field] === 'number' ||
                  this.metaColumns[field] === 'dateTime'
                ) {
                  if (Array.isArray(value) && value.length === 2) {
                    subQuery
                      .where('key', field)
                      .andWhereRaw(`${castedValue} between ? and ?`, [
                        this.prepareValue(field, value[0]),
                        this.prepareValue(field, value[1]),
                      ])
                  } else {
                    this._diagnostics.push("The 'between' value must be a tuple")
                  }
                } else {
                  this._diagnostics.push(
                    `The 'between' operator cannot be used for field '${field}'`,
                  )
                }
              } else if (method === 'In' || method === 'NotIn') {
                if (Array.isArray(value)) {
                  subQuery
                    .where('key', field)
                    .andWhereRaw(`${castedValue} ${method === 'In' ? 'in' : 'not in'} (?)`, [
                      value.map((v) => this.prepareValue(v, field)).filter((v) => v !== undefined),
                    ])
                } else {
                  this._diagnostics.push("The 'in' value must be an array")
                }
              } else if (method === 'Null') {
                subQuery.where('key', field).andWhereNull('value')
              } else if (method === 'NotNull') {
                subQuery.where('key', field).andWhereNotNull('value')
              }
            },
          )
        }
      } else {
        this._diagnostics.push(`Field '${field}' does not exist`)
      }
    }

    return query
  }

  /**
   * @todo
   */
  search(keywords: string): this {
    keywords
      .toLowerCase()
      .split(' ')
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .forEach((keyword, index) => {
        this.keywordSelects.push(
          Database.raw(
            this.driver === 'sqlite'
              ? `instr(_keywords, ?) as __match${index}`
              : `position(? in _keywords) as __match${index}`,
            [keyword],
          ),
        )

        this.query = this.query.where(`__match${index}`, '>', 0)
      })

    return this
  }

  /**
   * @todo
   */
  orderBy(field: T['SortableField'], direction: 'asc' | 'desc' = 'desc'): this {
    if (this.isSortable(field) === false) {
      this._diagnostics.push(`Field '${field}' is not sortable`)
    } else {
      if (this.metaColumns[field] && this.metaColumns[field] !== 'json') {
        this.aliasedMetaColumns.add(field)
      }

      const column = this.columns[field] ? camelToSnake(field) : field

      if (this.columns[field] === 'string' || this.metaColumns[field] === 'string') {
        if (this.driver === 'sqlite') {
          this.query = this.query.orderByRaw(`\`${column}\` collate nocase ${direction} nulls last`)
        } else {
          this.query = this.query.orderByRaw(`\`${column}\` ${direction} nulls last`)
        }
      } else if (this.columns[field] && this.columns[field] !== 'json') {
        this.query = this.query.orderByRaw(`\`${column}\` ${direction} nulls last`)
      } else if (this.metaColumns[field] && this.metaColumns[field] !== 'json') {
        this.query = this.query.orderByRaw(`cast(\`${column}\` as numeric) ${direction} nulls last`)
      } else if (!this.metaColumns[field] && !this.metaColumns[field]) {
        this._diagnostics.push(`Field '${column}' does not exist`)
      } else {
        this._diagnostics.push('Object fields cannot be sorted')
      }
    }

    return this
  }

  /**
   * @todo
   */
  orderBySearchScore(): this {
    if (this.keywordSelects.length) {
      const matches = this.keywordSelects.map((_, index) => `__match${index}`)
      this.query = this.query.orderByRaw(`(${matches.join(' + ')})`)
    }

    return this
  }

  /**
   * Apply a `group by` clause to the query.
   *
   * @example
   * ```js
   * // Get existing page types
   * const results = await queryPages().select('type').groupBy('type').all()
   * const types = results.map(row => row.type)
   * ```
   */
  groupBy(...fields: T['SelectableField'][]): this {
    fields.forEach((field) => {
      if (this.columns[field]) {
        if (this.columns[field] === 'json') {
          this._diagnostics.push('Cannot group by JSON fields')
        } else {
          this.query = this.query.groupBy(camelToSnake(field))
        }
      } else if (this.metaColumns[field]) {
        this._diagnostics.push(`Custom fields cannot be grouped ('${field}')`)
      } else {
        this._diagnostics.push(`Field '${field}' does not exist`)
      }
    })

    return this
  }

  protected prepare() {
    if (!this.prepared) {
      this.prepareSelect()

      if (this.translatable) {
        if (this._language === '*') {
          this.query = this.query.whereIn(
            'language',
            config.languages!.map((language) => language.code),
          )
        } else {
          this.query = this.query.where('language', this._language || config.defaultLanguage!)
        }
      }

      this.prepared = true
    }

    return this.query
  }

  protected prepareSelect() {
    this.query = this.query.select('*', ...this.keywordSelects)
    return this.query
  }

  protected prepareValue(value: any, field: string): any {
    const calendarField = this.metaColumns[field]
      ? this.fields.find((_field) => {
          return (
            _field.name === field &&
            (_field.type === 'date' || _field.type === 'dateTime' || _field.type === 'time')
          )
        })
      : undefined

    const type = calendarField ? 'dateTime' : this.columns[field] || this.metaColumns[field]

    if (type === 'string') {
      try {
        return value.toString()
      } catch (e) {
        return undefined
      }
    } else if (type === 'number') {
      return +value
    } else if (type === 'boolean') {
      return value === 'true' || value === 't'
        ? 1
        : value === 'false' || value === 'f'
        ? 0
        : +!!value
    } else if (type === 'dateTime') {
      if (typeof value === 'string') {
        if (isNumeric(value)) {
          value = +value
        } else {
          try {
            if (calendarField?.type === 'time') {
              value = DateTime.fromSQL(`1970-01-01 ${value}`, { zone: 'UTC' }).toMillis()
            } else {
              value = DateTime.fromSQL(value, { zone: 'UTC' }).toMillis()
            }
          } catch (_) {
            return undefined
          }
        }
      }

      if (this.columns[field]) {
        try {
          return DateTime.fromMillis(+value).toSQL()
        } catch (_) {
          return undefined
        }
      } else {
        return value
      }
    }

    return undefined
  }

  protected async serialize(
    result: Page | Preset | Upload | Post | Role | User,
    camelizeColumns: boolean = true,
  ): Promise<T['Result']> {
    if (this.selectedMetaColumns.size) {
      await (result as any).$relation('meta')
    }

    if ((result as any).check) {
      await (result as any).check()
    }

    const tuples: [string, any][] = []

    for (const relation of this.loadRelations) {
      if (relation === 'translations') {
        const translations = await getTranslations(
          this.table as LanguageType,
          result.id,
          result,
          this.populateFields,
        )

        if (this.table !== 'pages') {
          Object.values(translations).forEach((translation) => {
            delete translation?.path
            delete translation?.url
          })
        }

        tuples.push([relation, translations])
      } else {
        let data = await (result as any).$relation(relation)

        if (Array.isArray(data)) {
          data = data.map((item) => (item.serialize ? item.serialize() : item))
        }

        tuples.push([relation, data ? (data.serialize ? data.serialize() : data) : null])
      }
    }

    const serialized = result.serialize()

    Object.entries(serialized).forEach(([column, value]) => {
      const camelizedColumn = camelizeColumns ? camelize(column) : column

      if (camelizedColumn === 'id' || this.selectedColumns.has(camelizedColumn)) {
        tuples.push([camelizedColumn, value])
      }
    })

    this.selectedMetaColumns.forEach((column) => {
      const meta = serialized.meta.find((meta: PageMeta) => meta.key === column)
      tuples.push([
        column,
        meta && meta.value !== null
          ? this.metaColumns[column] === 'string' || this.metaColumns[column] === 'json'
            ? meta.value
            : this.metaColumns[column] === 'boolean'
            ? !!+meta.value
            : +meta.value
          : null,
      ])
    })

    const record = Object.fromEntries(tuples) as T

    if (this.readHook) {
      await this.readHook(record)
    }

    if (this.populateFields) {
      await this.populateRecord(record)

      if (this.populateHook) {
        await this.populateHook(record)
      }
    }

    return record
  }

  protected async populateRecord(_record: Record<string, any>) {}

  /**
   * Fetch the relationship data alongside the main query.
   *
   * @example
   * ```js
   * await queryPages().with('translations').all() // Returns all pages with references to their translations
   * ```
   */
  with(...relations: (T['ComputedField'] | '*')[]): this {
    if (relations.includes('*')) {
      this.relations.forEach((relation) => this.loadRelations.add(relation))
    } else {
      relations.forEach((relation: T['ComputedField']) => {
        if (this.relations.includes(relation)) {
          this.loadRelations.add(relation)
        } else {
          this._diagnostics.push(`Relation '${relation}' does not exist`)
        }
      })
    }

    return this
  }

  /**
   * @todo descriptions
   */
  populate(): this {
    this.populateFields = true
    return this
  }

  /**
   * Apply a `limit` to the SQL query.
   *
   * @example
   * ```js
   * await queryPages().where('public', true).orderBy('publishDate', 'desc').limit(5).all()
   * // Returns the recent 5 published pages
   * ```
   */
  limit(limit: number): this {
    this.query = this.query.limit(limit)
    return this
  }

  /**
   * Remove any `limit` from the SQL query.
   *
   * @example
   * ```js
   * await queryPages().limit(1).clearLimit().all() // Returns all pages
   * ```
   */
  clearLimit(): this {
    this.query = this.query.clearLimit()
    return this
  }

  /**
   * Apply an `offset` to the SQL query.
   *
   * @example
   * ```js
   * await queryPages().orderBy('createdAt', 'desc').offset(1).all() // Returns all pages except the newest
   * ```
   */
  offset(offset: number): this {
    this.query = this.query.offset(offset)
    return this
  }

  /**
   * Remove any `offset` from the SQL query.
   *
   * @example
   * ```js
   * await queryPages().offset(1).clearOffset().all() // Returns all pages
   * ```
   */
  clearOffset(): this {
    this.query = this.query.clearOffset()
    return this
  }

  /**
   * Get the number of rows found.
   *
   * @example
   * ```js
   * await queryPages().where('public', true).count() // Returns the number of published pages
   * ```
   */
  async count(): Promise<number> {
    await this.prepare()

    const results = await this.query
      .clone()
      .clearOrder()
      .clearOffset()
      .clearLimit()
      .count('*', 'total')

    return results.length ? results[0].$extras.total : 0
  }

  /**
   * Returns the first row from the database.
   *
   * @example
   * ```js
   * await queryPages().where('public', true).orderBy('publishDate', 'desc').first() // Returns the last published page
   * ```
   */
  async first(): Promise<T['Result'] | null> {
    const result = await this.prepare().first()
    return result ? await this.serialize(result) : null
  }

  /**
   * Returns an array of rows returned by the SQL queries.
   *
   * @example
   * ```js
   * await queryPages().all() // Returns all pages
   * ```
   */
  async all(): Promise<T['Result'][]> {
    const results = await this.prepare().exec()
    const serialized: any[] = []

    for (const result of results) {
      serialized.push(await this.serialize(result))
    }

    return serialized as T['Result'][]
  }

  /**
   * Returns paginated query results.
   *
   * Note: The maximum number of rows is defined with the config parameter
   * `perPageLimit`.
   *
   * @see https://pruvious.com/documentation/essentials/query-builder#pagination
   * @example
   * ```js
   * await queryPages().paginate(2, 10) // Returns rows 11 to 20
   * ```
   */
  async paginate(
    page?: number,
    perPage?: number,
  ): Promise<{ data: T['Result'][]; meta: Pagination }> {
    page = Math.floor(Math.max(1, page || this.page))
    perPage = Math.floor(Math.max(1, Math.min(perPage || this.perPage, this.perPageLimit)))

    const data = await this.offset((page - 1) * perPage)
      .limit(perPage)
      .all()

    const total = await this.count()

    return {
      data,
      meta: {
        currentPage: page,
        firstPage: 1,
        lastPage: Math.ceil((total || 1) / perPage),
        perPage,
        total,
      },
    }
  }
}

export function prepareFieldValue(value: any, defaultValue: any): any {
  return value === undefined ? defaultValue : value
}

export { Database }
