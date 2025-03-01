import type {
  Collection,
  DefaultQueryBuilderParamsOptions,
  ExtractCastedTypes,
  ExtractPopulatedTypes,
  InsertInput,
  InsertQueryBuilderParamsOptions,
  QueryBuilderResult,
} from '@pruvious/orm'
import {
  insertQueryBuilderParamsToQueryString,
  queryStringToInsertQueryBuilderParams,
} from '@pruvious/orm/query-string'
import { deepClone, isDefined, toArray, uniqueArray, type NonEmptyArray } from '@pruvious/utils'
import { ConditionalQueryBuilder } from './ConditionalQueryBuilder'
import type { QueryBuilderOptions } from './QueryBuilder'

/**
 * A utility class for constructing and querying collection records through the POST collections API in a type-safe manner.
 * This class is designed for client-side code and only works for collections that have the `api.create` setting enabled.
 *
 * @example
 * ```ts
 * const newStudents = await this.insertInto('Students')
 *   .values([
 *     { firstName: 'Draco', lastName: 'Malfoy', house: 2, prefect: true },
 *     { firstName: 'Luna', lastName: 'Lovegood', house: 3 },
 *     { firstName: 'Neville', lastName: 'Longbottom', house: 1 },
 *   ])
 *   .returning(['firstName', 'lastName'])
 *   .run()
 *
 * console.log(newStudents)
 * // {
 * //   success: true,
 * //   data: [
 * //     { firstName: 'Draco', lastName: 'Malfoy' },
 * //     { firstName: 'Luna', lastName: 'Lovegood' },
 * //     { firstName: 'Neville', lastName: 'Longbottom' },
 * //   ],
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 *
 * const insertedBookCount = await this.insertInto('Books')
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
 * const failedInsert = await this.insertInto('Spells')
 *   .values({ name: 'Avada Kedavra' })
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
export class InsertQueryBuilder<
  TCollections extends Record<string, Collection<Record<string, any>, Record<string, any>>>,
  TCollectionName extends keyof TCollections & string,
  TCollection extends TCollections[TCollectionName],
  TReturnType extends 'rows' | 'count' = 'count',
  TReturningFields extends TCollection['TColumnNames'] | 'id' = never,
  TKnownReturningFields extends boolean = true,
  TPopulateFields extends boolean = false,
> extends ConditionalQueryBuilder<TCollections, TCollectionName, TCollection> {
  protected input: Record<string, any>[] = []
  protected returnType: 'rows' | 'count' = 'count'
  protected returningFields: string[] = []
  protected populateFields: boolean = false

  constructor(
    collectionName: TCollectionName,
    protected options: Required<QueryBuilderOptions> & {
      apiRouteResolver: Required<QueryBuilderOptions['apiRouteResolver']>
    },
  ) {
    super(collectionName)
  }

  /**
   * Applies a query string to the current query builder instance.
   *
   * The following query string parameters are supported:
   *
   * - `returning` - Comma-separated list of fields to return after the INSERT operation.
   * - `populate` - Whether to return populated field values after the INSERT operation.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const newStudents = await this.insertInto('Students')
   *   .fromQueryString('returning=firstName,lastName')
   *   .values([
   *     { firstName: 'Draco', lastName: 'Malfoy', house: 2, prefect: true },
   *     { firstName: 'Luna', lastName: 'Lovegood', house: 3 },
   *     { firstName: 'Neville', lastName: 'Longbottom', house: 1 },
   *   ])
   *   .run()
   *
   * console.log(newStudents)
   * // {
   * //   success: true,
   * //   data: [
   * //     { firstName: 'Draco', lastName: 'Malfoy' },
   * //     { firstName: 'Luna', lastName: 'Lovegood' },
   * //     { firstName: 'Neville', lastName: 'Longbottom' },
   * //   ],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  fromQueryString(
    queryString: string | URLSearchParams | Record<string, string | string[]>,
    options?: InsertQueryBuilderParamsOptions<TCollection['TColumnNames'] | 'id'> & DefaultQueryBuilderParamsOptions,
  ): InsertQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    'rows' | 'count',
    TReturningFields,
    false,
    TPopulateFields
  > {
    const params = queryStringToInsertQueryBuilderParams(queryString, options)

    if (params.returning) {
      this.returning(params.returning.includes('*') ? ['*'] : (params.returning as any))
    } else if (options?.withDefaults) {
      this.clearReturning()
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
   * - `returning` - Comma-separated list of fields to return after the INSERT operation.
   * - `populate` - Whether to return populated field values after the INSERT operation.
   *
   * The `options` parameter can be used to specify additional options for the query string generation.
   *
   * @example
   * ```ts
   * const queryString = this.insertInto('Students')
   *   .values([
   *     { firstName: 'Draco', lastName: 'Malfoy', house: 2, prefect: true },
   *     { firstName: 'Luna', lastName: 'Lovegood', house: 3 },
   *     { firstName: 'Neville', lastName: 'Longbottom', house: 1 },
   *   ])
   *   .returning(['firstName', 'lastName'])
   *   .toQueryString()
   *
   * console.log(queryString)
   * // 'returning=firstName,lastName'
   * ```
   */
  toQueryString(
    options?: InsertQueryBuilderParamsOptions<TCollection['TColumnNames'] | 'id'> & DefaultQueryBuilderParamsOptions,
  ): string {
    const wd = !!options?.withDefaults

    return insertQueryBuilderParamsToQueryString(
      {
        returning: this.returnType === 'rows' ? this.returningFields : undefined,
        populate: this.populateFields === true ? this.populateFields : wd ? false : undefined,
      },
      options,
    )
  }

  /**
   * Clones the current query builder instance.
   */
  clone(): this {
    const clone = new InsertQueryBuilder(this.collectionName, this.options)

    clone.input = deepClone(this.input)
    clone.returnType = this.returnType
    clone.returningFields = [...this.returningFields]
    clone.populateFields = this.populateFields

    return clone as any
  }

  /**
   * Sets the data to be inserted into the collection as an array of row objects.
   *
   * This method will override any previously set input data.
   *
   * @example
   * ```ts
   * const newStudents = await this.insertInto('Students')
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
   * ```
   */
  values<T extends InsertInput<TCollection>>(input: T[] | T): this {
    this.input = deepClone(toArray(input))
    return this
  }

  /**
   * Specifies which `fields` should be returned after the INSERT operation.
   *
   * This method will override any previously set RETURNING fields.
   *
   * @example
   * ```ts
   * const newStudent = await this.insertInto('Students')
   *   .values({ firstName: 'Hermione', lastName: 'Granger', house: 1 })
   *   .returning(['firstName', 'lastName'])
   *   .run()
   *
   * console.log(newStudent)
   * // {
   * //   success: true,
   * //   data: [{ firstName: 'Hermione', lastName: 'Granger' }],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  returning<TReturningFields extends TCollection['TColumnNames'] | 'id'>(
    fields: NonEmptyArray<TReturningFields>,
  ): InsertQueryBuilder<TCollections, TCollectionName, TCollection, 'rows', TReturningFields, true, TPopulateFields>
  returning<TReturningFields extends TCollection['TColumnNames'] | 'id'>(
    field: TReturningFields,
  ): InsertQueryBuilder<TCollections, TCollectionName, TCollection, 'rows', TReturningFields, true, TPopulateFields>
  returning<TReturningFields extends TCollection['TColumnNames'] | 'id'>(
    fields: NonEmptyArray<TReturningFields> | TReturningFields,
  ) {
    this.returnType = 'rows'
    this.returningFields = uniqueArray(toArray(fields))
    return this as InsertQueryBuilder<
      TCollections,
      TCollectionName,
      TCollection,
      'rows',
      TReturningFields,
      true,
      TPopulateFields
    >
  }

  /**
   * Specifies that all fields should be returned after the INSERT operation.
   *
   * @example
   * ```ts
   * const newHouse = await this.insertInto('Houses')
   *   .values({ name: 'Ravenclaw', founder: 'Rowena Ravenclaw' })
   *   .returningAll()
   *   .run()
   *
   * console.log(newHouse)
   * // {
   * //   success: true,
   * //   data: [{
   * //     id: 3,
   * //     name: 'Ravenclaw',
   * //     founder: 'Rowena Ravenclaw',
   * //     createdAt: 1724091250000,
   * //     updatedAt: 1724091250000,
   * //   }],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  returningAll(): InsertQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    'rows',
    TCollection['TColumnNames'] | 'id',
    true,
    TPopulateFields
  > {
    this.returnType = 'rows'
    this.returningFields = ['*']
    return this as any
  }

  /**
   * Clears any previously set RETURNING fields and sets the return type to `count`.
   * This means the INSERT operation will return the number of affected rows instead of the inserted data.
   *
   * @example
   * ```ts
   * const insertedBookCount = await this.insertInto('Books')
   *   .values([
   *     { title: 'Hogwarts: A History', author: 'Bathilda Bagshot' },
   *     { title: 'Fantastic Beasts and Where to Find Them', author: 'Newt Scamander' },
   *   ])
   *   .returning(['id']) // This will be ignored
   *   .clearReturning()  // This will clear the RETURNING fields
   *   .run()
   *
   * console.log(insertedBookCount)
   * // {
   * //   success: true,
   * //   data: 2,
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  clearReturning(): InsertQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    'count',
    never,
    true,
    TPopulateFields
  > {
    this.returnType = 'count'
    this.returningFields = []
    return this as any
  }

  /**
   * Specifies that the query should return populated field values.
   * Field populators transform the field value into a format suitable for application use.
   * They can retrieve related data from the database, format the value, or perform other operations.
   *
   * @example
   * ```ts
   * const newStudent = await this.insertInto('Students')
   *   .values({ firstName: 'Hermione', lastName: 'Granger', house: 1 })
   *   .returning(['id', 'house'])
   *   .populate()
   *   .run()
   *
   * console.log(newStudent)
   * // {
   * //   success: true,
   * //   data: [{
   * //     id: 2,
   * //     house: {
   * //       id: 1,
   * //       name: 'Gryffindor',
   * //       points: 100,
   * //     },
   * //   }],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   * ```
   */
  populate(): InsertQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TReturnType,
    TReturningFields,
    TKnownReturningFields,
    true
  > {
    this.populateFields = true
    return this
  }

  /**
   * Disables field population for the query.
   * The query will return casted field values without executing any field populators.
   *
   * @example
   * ```ts
   * this.insertInto('Students')
   *   .values({ firstName: 'Hermione', lastName: 'Granger', house: 1 })
   *   .returning(['id', 'house'])
   *   .populate()      // This will be ignored
   *   .clearPopulate() // This will disable field population
   *   .all()
   * ```
   */
  clearPopulate(): InsertQueryBuilder<
    TCollections,
    TCollectionName,
    TCollection,
    TReturnType,
    TReturningFields,
    TKnownReturningFields,
    false
  > {
    this.populateFields = true
    return this
  }

  /**
   * Executes the INSERT query and returns the results.
   *
   * @example
   * ```ts
   * const newSpell = await this.insertInto('Spells')
   *   .values({ name: 'Expecto Patronum', type: 'Charm', difficulty: 'Advanced' })
   *   .returning(['name'])
   *   .run()
   *
   * console.log(newSpell)
   * // {
   * //   success: true,
   * //   data: [{ name: 'Expecto Patronum' }],
   * //   runtimeError: undefined,
   * //   inputErrors: undefined,
   * // }
   *
   * const failedInsert = await this.insertInto('Spells')
   *   .values({ name: 'Avada Kedavra' })
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
  async run(): Promise<
    QueryBuilderResult<
      TReturnType extends 'count'
        ? number
        : (TKnownReturningFields extends false
            ? Partial<
                (TPopulateFields extends true
                  ? ExtractPopulatedTypes<TCollection['fields']>
                  : ExtractCastedTypes<TCollection['fields']>) & { id: number }
              > &
                Record<string, any>
            : Pick<
                (TPopulateFields extends true
                  ? ExtractPopulatedTypes<TCollection['fields']>
                  : ExtractCastedTypes<TCollection['fields']>) & { id: number },
                TReturningFields
              >)[],
      Record<string, string>[]
    >
  > {
    const response = await this.options.fetcher(this.options.apiRouteResolver.create(this.collectionName), {
      body: { query: this.toQueryString(), data: this.input },
    })

    if (response.success) {
      return {
        success: true,
        data: response.data,
        runtimeError: undefined,
        inputErrors: undefined,
      }
    } else if (response.error.statusCode === 422) {
      return {
        success: false,
        data: undefined,
        runtimeError: undefined,
        inputErrors: response.error.data as Record<string, string>[],
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
