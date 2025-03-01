import { pruviousPost, type PruviousFetchResponse } from '#pruvious/client'
import type { Collection } from '@pruvious/orm'
import { defu, slugify } from '@pruvious/utils'
import { DeleteQueryBuilder } from './DeleteQueryBuilder'
import { InsertQueryBuilder } from './InsertQueryBuilder'
import { SelectQueryBuilder } from './SelectQueryBuilder'
import { UpdateQueryBuilder } from './UpdateQueryBuilder'

export interface QueryBuilderOptions {
  /**
   * A custom fetcher function to use for fetching data.
   *
   * @default pruviousPost
   */
  fetcher?: (route: any, options: any) => Promise<PruviousFetchResponse<any>>

  /**
   * A custom path resolver function to use for resolving API routes.
   * Only POST HTTP method routes are supported.
   */
  apiRouteResolver?: {
    /**
     * Resolves the POST path for creating a new collection record.
     *
     * @default
     * (collectionName) => `collections/${slugify(collectionName)}/query/create`
     */
    create?: (collectionName: string) => string

    /**
     * Resolves the POST path for reading collection records.
     *
     * @default
     * (collectionName) => `collections/${slugify(collectionName)}/query/read`
     */
    read?: (collectionName: string) => string

    /**
     * Resolves the POST path for updating a collection record.
     *
     * @default
     * (collectionName) => `collections/${slugify(collectionName)}/query/update`
     */
    update?: (collectionName: string) => string

    /**
     * Resolves the POST path for deleting a collection record.
     *
     * @default
     * (collectionName) => `collections/${slugify(collectionName)}/query/delete`
     */
    delete?: (collectionName: string) => string
  }
}

/**
 * A utility class for constructing and managing database queries through HTTP requests.
 * This class is designed for client-side code and only works for collections that have the `api` setting enabled.
 * It provides a type-safe way to interact with collection records in the Pruvious dashboard.
 *
 * @example
 * ```ts
 * const students = await this.selectFrom('Students')
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
 * const spells = await this.insertInto('Spells')
 *   .values([
 *     { name: 'Expecto Patronum', type: 'Charm', difficulty: 'Advanced' },
 *     { name: 'Lumos', type: 'Charm', difficulty: 'Beginner' },
 *   ])
 *   .returning(['name'])
 *   .run()
 *
 * console.log(spells)
 * // {
 * //   success: true,
 * //   data: [
 * //     { name: 'Expecto Patronum' },
 * //     { name: 'Lumos' },
 * //   ],
 * //   runtimeError: undefined,
 * //   inputErrors: undefined,
 * // }
 * ```
 */
export class QueryBuilder<TCollections extends Record<string, Collection<any, Record<string, any>>>> {
  protected options: Required<QueryBuilderOptions> & {
    apiRouteResolver: Required<QueryBuilderOptions['apiRouteResolver']>
  }

  constructor(options?: QueryBuilderOptions) {
    this.options = defu(options ?? {}, {
      fetcher: pruviousPost,
      apiRouteResolver: {
        create: (collectionName) => `collections/${slugify(collectionName)}/query/create`,
        read: (collectionName) => `collections/${slugify(collectionName)}/query/read`,
        update: (collectionName) => `collections/${slugify(collectionName)}/query/update`,
        delete: (collectionName) => `collections/${slugify(collectionName)}/query/delete`,
      },
    } satisfies QueryBuilderOptions)
  }

  /**
   * Creates a new client-side `InsertQueryBuilder` for a specific `collection`.
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
  insertInto<TCollectionName extends keyof TCollections & string>(
    collectionName: TCollectionName,
  ): InsertQueryBuilder<TCollections, TCollectionName, TCollections[TCollectionName]> {
    return new InsertQueryBuilder(collectionName, this.options)
  }

  /**
   * Creates a new client-side `SelectQueryBuilder` for a specific `collection`.
   *
   * @example
   * ```ts
   * const students = await this.selectFrom('Students')
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
   * const houses = await this.selectFrom('Houses')
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
   * const failedSelect = await this.selectFrom('Wands')
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
  selectFrom<TCollectionName extends keyof TCollections & string>(
    collectionName: TCollectionName,
  ): SelectQueryBuilder<TCollections, TCollectionName, TCollections[TCollectionName]> {
    return new SelectQueryBuilder(collectionName, this.options)
  }

  /**
   * Creates a new client-side `UpdateQueryBuilder` for a specific `collection`.
   *
   * @example
   * ```ts
   * const updatedStudent = await this.update('Students')
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
   * const updatedBookCount = await this.update('Books')
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
   * const failedUpdate = await this.update('Spells')
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
  update<TCollectionName extends keyof TCollections & string>(
    collectionName: TCollectionName,
  ): UpdateQueryBuilder<TCollections, TCollectionName, TCollections[TCollectionName]> {
    return new UpdateQueryBuilder(collectionName, this.options)
  }

  /**
   * Creates a new client-side `DeleteQueryBuilder` for a specific `collection`.
   *
   * @example
   * ```ts
   * const deletedStudent = await this.deleteFrom('Students')
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
   * const deletedBookCount = await this.deleteFrom('Books')
   *   .where('author', '=', 'Gilderoy Lockhart')
   *   .run()
   *
   * console.log(deletedBookCount) // 7
   *
   * const failedDelete = await this.deleteFrom('Houses')
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
  deleteFrom<TCollectionName extends keyof TCollections & string>(
    collectionName: TCollectionName,
  ): DeleteQueryBuilder<TCollections, TCollectionName, TCollections[TCollectionName]> {
    return new DeleteQueryBuilder(collectionName, this.options)
  }
}
