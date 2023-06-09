import { validator } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import {
  CDFields,
  PostRecord,
  QueryStringParameters,
  ReturnOptions,
  SFields,
  UFields,
  UpdateResult,
  ValidationError,
  ValidationResults,
  flattenFields,
  getDefaultFieldValue,
  getFieldValueType,
  standardCollectionColumns,
  standardCollectionFields,
} from '@pruvious/shared'
import { Pruvious } from '@pruvious/types'
import Post from 'App/Models/Post'
import Translation from 'App/Models/Translation'
import PostValidator from 'App/Validators/PostValidator'
import { collectionsConfig, config } from 'App/imports'
import { populatePost } from 'App/populator'
import { getTranslations } from 'App/translations'
import { DateTime } from 'luxon'
import { BaseQuery, prepareFieldValue } from './BaseQuery'
import { getMetaFields } from './model-utils'
import { addInternalJob } from './worker'

type PostResult<CollectionName extends Pruvious.Collection> = SFields<
  Pruvious.Post[CollectionName],
  Pruvious.PostInput[CollectionName],
  Pruvious.SelectablePostField[CollectionName] | Pruvious.ComputedPostField
>

type T<CollectionName extends Pruvious.Collection> = {
  Input: Pruvious.PostInput[CollectionName]
  Result: PostResult<CollectionName>
  PopulatedResult: Pruvious.Post[CollectionName]
  ComputedField: Pruvious.ComputedPostField
  SelectableField: Pruvious.SelectablePostField[CollectionName]
  SortableField: Pruvious.SortablePostField[CollectionName]
  FilterableField: Pruvious.FilterablePostField[CollectionName]
  StringField: Pruvious.PostStringField[CollectionName]
  NumberField: Pruvious.PostNumberField[CollectionName]
  BooleanField: Pruvious.PostBooleanField[CollectionName]
  LanguageCode: Pruvious.Post[CollectionName]['language']
}

export class PostQuery<
  CollectionName extends Pruvious.Collection,
  QueryString = QueryStringParameters<{
    LanguageCode: Pruvious.Post[CollectionName]['language']
    Model: Pruvious.PostInput[CollectionName]
    SelectableField: Pruvious.SelectablePostField[CollectionName]
    SortableField: Pruvious.SortablePostField[CollectionName]
    FilterableField: Pruvious.FilterablePostField[CollectionName]
    StringField: Pruvious.PostStringField[CollectionName]
    NumberField: Pruvious.PostNumberField[CollectionName]
    BooleanField: Pruvious.PostBooleanField[CollectionName]
  }>,
> extends BaseQuery<T<CollectionName>> {
  protected collectionTranslatable: boolean = true

  constructor(protected collection: CollectionName, params?: string | QueryString) {
    super()

    this.table = 'posts'

    this.query = Post.query()

    this.columns = standardCollectionColumns

    this.fields.push(...standardCollectionFields)

    this.collectionTranslatable = collectionsConfig[collection].translatable!

    this.relations.push('translations')

    this.createHook = collectionsConfig[collection].onCreate
    this.readHook = collectionsConfig[collection].onRead
    this.populateHook = collectionsConfig[collection].onPopulate
    this.updateHook = collectionsConfig[collection].onUpdate
    this.deleteHook = collectionsConfig[collection].onDelete

    if (collectionsConfig[this.collection].fields) {
      flattenFields(collectionsConfig[this.collection].fields!).forEach((field) => {
        this.metaColumns[field.name] = getFieldValueType(field)
        this.fields.push(field)
      })
    }

    if (collectionsConfig[this.collection].listing?.perPage) {
      this.perPage = collectionsConfig[this.collection].listing!.perPage!
    }

    if (collectionsConfig[this.collection].perPageLimit) {
      this.perPageLimit = collectionsConfig[this.collection].perPageLimit!
    }

    if (typeof params === 'string') {
      this.fromQueryString(params)
    } else if (typeof params === 'object') {
      this.apply(params as any)
    }
  }

  /**
   * Apply filters, selected fields, and sort and pagination parameters from a query string `value`.
   *
   * @example
   * ```js
   * await queryPosts('products').fromQueryString('sort=createdAt:desc&filters[createdAt][$gte]=2023-01-01')
   *
   * // Alternative 1:
   * await queryPosts('products').apply({ sort: 'createdAt:desc', filters: { createdAt: { $gte: '2023-01-01' } } })
   *
   * // Alternative 2:
   * await queryPosts('products').whereGte('createdAt', '2023-01-01').orderBy('createdAt', 'desc')
   * ```
   */
  fromQueryString(value: string): this {
    return super.fromQueryString(value)
  }

  /**
   * Apply filters, selected fields, locales, and sort and pagination parameters from parsed query string `params`.
   *
   * @example
   * ```js
   * await queryPosts('products').apply({ sort: 'createdAt:desc', filters: { createdAt: { $gte: '2023-01-01' } } })
   *
   * // Alternative 1:
   * await queryPosts('products').fromQueryString('sort=createdAt:desc&filters[createdAt][$gte]=2023-01-01')
   *
   * // Alternative 2:
   * await queryPosts('products').whereGte('createdAt', '2023-01-01').orderBy('createdAt', 'desc')
   * ```
   */
  apply(
    params: QueryStringParameters<{
      LanguageCode: T<CollectionName>['LanguageCode']
      Model: T<CollectionName>['Input']
      SelectableField: T<CollectionName>['SelectableField']
      SortableField: T<CollectionName>['SortableField']
      FilterableField: T<CollectionName>['FilterableField']
      StringField: T<CollectionName>['StringField']
      NumberField: T<CollectionName>['NumberField']
      BooleanField: T<CollectionName>['BooleanField']
    }>,
  ): this {
    return super.apply(params)
  }

  /**
   * Return posts for a specific language `code`.
   *
   * @example
   * ```js
   * await queryPosts('products').language('de').all() // Returns all posts in German
   * await queryPosts('products').language('*').all() // Returns all posts
   * ```
   */
  language(code: Pruvious.Post[CollectionName]['language'] | '*'): this {
    if (this.collectionTranslatable) {
      this.setLanguage(code)
    }

    return this
  }

  protected setLanguage(code: string): this {
    if (this.collectionTranslatable) {
      super.setLanguage(code)
    }

    return this
  }

  /**
   * An array of field names that will be returned in the query results.
   * Use a wildcard (*) to select all fields.
   *
   * @example
   * ```js
   * await queryPosts('products').select('id', 'public', 'price').all()
   * // [{ id: 1, public: true, price: 99 }]
   * ```
   */
  select(...fields: (T<CollectionName>['SelectableField'] | '*')[]): this {
    return super.select(...fields)
  }

  protected prepareSelect() {
    if (this.aliasedMetaColumns.size) {
      const select: any[] = ['posts.*', 'post_meta.key', 'post_meta.value', ...this.keywordSelects]

      this.aliasedMetaColumns.forEach((column) => {
        const sql =
          this.metaColumns[column] === 'string'
            ? `max(case when post_meta.key = '${column}' then post_meta.value end) as \`${column}\``
            : `max(case when post_meta.key = '${column}' then cast(post_meta.value as numeric) end) as \`${column}\``

        select.push(Database.raw(sql))
      })

      this.query = this.query
        .leftJoin('post_meta', 'posts.id', 'post_meta.post_id')
        .groupBy('posts.id')
        .select(...select)
        .where('posts.collection', this.collection)
    } else {
      this.query = this.query
        .select('*', ...this.keywordSelects)
        .where('posts.collection', this.collection)
    }

    return this.query
  }

  protected async populateRecord(post: PostResult<CollectionName>) {
    await populatePost(this.collection, post as any, this._skipPopulate)
  }

  /**
   * Retrieve a post by its ID.
   *
   * @example
   * ```js
   * await queryPosts('products').find(1)
   * ```
   */
  async find(id: number): Promise<PostResult<CollectionName> | null> {
    const post = await Post.find(id)
    return post ? ((await this.serialize(post)) as PostResult<CollectionName>) : null
  }

  /**
   * Find a post based on a specific field-value pair.
   *
   * @example
   * ```js
   * await queryPosts('products').findBy('sku', 1337)
   * ```
   */
  async findBy<FieldName extends Pruvious.FilterablePostField[CollectionName]>(
    field: FieldName,
    value: Exclude<Pruvious.PostInput[CollectionName][FieldName], null>,
  ): Promise<PostResult<CollectionName> | null> {
    const posts = await this.$where('', 'and', field, value, Post.query())
      .orderBy('id', 'desc')
      .limit(1)

    return posts.length ? await this.serialize(posts[0]) : null
  }

  /**
   * Define a `where` clause in SQL queries by specifying a field name and a corresponding value to filter the query results.
   *
   * @example
   * ```js
   * await queryPosts('products').where('sku', 1337).first()
   * ```
   */
  where<
    FieldName extends T<CollectionName>['FilterableField'] &
      (
        | T<CollectionName>['StringField']
        | T<CollectionName>['NumberField']
        | T<CollectionName>['BooleanField']
      ),
  >(field: FieldName, value: Exclude<T<CollectionName>['Input'][FieldName], null>): this {
    return super.where(field, value)
  }

  /**
   * Refine the `where` clause in SQL queries using the `AND` operator by specifying a field name and a corresponding value to filter the query results.
   *
   * @alias where
   * @example
   * ```js
   * await queryPosts('products').where('sku', 1337).andWhere('available', true).first()
   * ```
   */
  andWhere<
    FieldName extends T<CollectionName>['FilterableField'] &
      (
        | T<CollectionName>['StringField']
        | T<CollectionName>['NumberField']
        | T<CollectionName>['BooleanField']
      ),
  >(field: FieldName, value: Exclude<T<CollectionName>['Input'][FieldName], null>): this {
    return super.andWhere(field, value)
  }

  protected async _create(
    fields: CDFields<
      Pruvious.PostInput[CollectionName],
      Pruvious.CreatablePostField[CollectionName],
      Pruvious.RequiredPostField[CollectionName],
      Pruvious.StandardPostField
    >,
  ): Promise<
    | { success: true; data: PostResult<CollectionName> }
    | { success: false; errors: ValidationError[] }
  > {
    if (this.createHook) {
      await this.createHook(fields)
    }

    const validationResults = await validatePostFields(this.collection, fields)

    if (validationResults.success) {
      let translationId: number | undefined

      const records = validationResults.data
      const metaEntries = validationResults.data.meta
        ? flattenFields(collectionsConfig[this.collection].fields ?? []).map((field) => ({
            key: field.name,
            value: prepareFieldValue(
              validationResults.data.meta[field.name],
              getDefaultFieldValue(field, 'meta'),
            ),
          }))
        : []

      if (records.translationOf) {
        const translationOf = await Database.from(this.table)
          .select('translation_id')
          .where('id', records.translationOf)
          .first()

        if (translationOf) {
          translationId = translationOf.translation_id
        }
      }

      const isPublic = prepareFieldValue(records.public, false)
      const post = await Post.create({
        public: isPublic,
        collection: this.collection,
        language: this.collectionTranslatable
          ? prepareFieldValue(records.language, config.defaultLanguage).trim()
          : config.defaultLanguage,
        translationId: translationId || (await Translation.create({})).id,
        publishDate: prepareFieldValue(records.publishDate, isPublic ? DateTime.now() : null),
      })

      await post.refresh()

      if (metaEntries.length) {
        await post.related('meta').updateOrCreateMany(metaEntries, 'key')
        await post.load('meta')
      }

      await post.safeRebuildRelations()
      await addInternalJob('flush', 'Post', post.id)

      return { success: true, data: await this.serialize(post) }
    }

    return validationResults
  }

  /**
   * Update the selected posts.
   *
   * @example
   * ```js
   * @todo
   * ```
   */
  async update(
    fields: UFields<
      Pruvious.PostInput[CollectionName],
      Pruvious.UpdateablePostField[CollectionName]
    >,
  ): Promise<UpdateResult<PostResult<CollectionName>>[]> {
    const results: UpdateResult<PostResult<CollectionName>>[] = []
    const posts: Post[] = await this.prepare().exec()

    if (this.updateHook) {
      await this.updateHook(fields)
    }

    for (const post of posts) {
      const fieldsToValidate: Record<string, any> = {
        ...(await getMetaFields(post, collectionsConfig[this.collection])),
        ...fields,
        id: post.id,
      }

      for (const column of Object.keys(this.columns)) {
        if (fieldsToValidate[column] === undefined) {
          fieldsToValidate[column] = post[column]
        }
      }

      const validationResults = await validatePostFields(
        this.collection,
        fieldsToValidate,
        'update',
      )

      if (validationResults.success) {
        const records = validationResults.data
        const metaEntries = validationResults.data.meta
          ? Object.entries(validationResults.data.meta)
              .filter(([fieldName, _]) => {
                const field = this.fields.find((field) => field.name === fieldName)
                return field && !field.readonly
              })
              .map(([fieldName, value]: [string, any]) => ({ key: fieldName, value }))
          : []
        const isPublic = prepareFieldValue(records.public, false)

        post.merge({
          public: isPublic,
          publishDate: prepareFieldValue(
            (fields as any).publishDate,
            isPublic ? DateTime.now() : null,
          ),
        })

        await post.save()
        await post.refresh()

        for (const metaEntry of metaEntries) {
          await post.related('meta').updateOrCreate({ key: metaEntry.key }, metaEntry)
        }

        await post.load('meta')
        await post.safeRebuildRelations()
        await addInternalJob('flush', 'Post', post.id)

        results.push({
          success: true,
          data: await this.serialize(post),
        })
      } else {
        results.push({
          success: false,
          data: await this.serialize(post),
          errors: validationResults.errors,
        })
      }
    }

    return results
  }

  /**
   * Delete the selected posts.
   *
   * @example
   * ```js
   * @todo
   * ```
   */
  async delete(): Promise<number[]> {
    const deleted: number[] = []
    const posts: Post[] = await this.prepare().exec()

    for (const post of posts) {
      if (this.deleteHook) {
        await this.deleteHook(post.id)
      }

      await post.$relation('translation')

      const translation = post.translation

      await post.delete()
      await translation.load('posts')

      if (!translation.posts.length) {
        await translation.delete()
      }

      deleted.push(post.id)
    }

    return deleted
  }
}

/**
 * Create a query builder instance for posts.
 *
 * @todo example
 */
export function queryPosts<CollectionName extends Pruvious.Collection>(
  collection: CollectionName,
  params?:
    | string
    | QueryStringParameters<{
        LanguageCode: Pruvious.Post[CollectionName]['language']
        Model: Pruvious.PostInput[CollectionName]
        SelectableField: Pruvious.SelectablePostField[CollectionName]
        SortableField: Pruvious.SortablePostField[CollectionName]
        FilterableField: Pruvious.FilterablePostField[CollectionName]
        StringField: Pruvious.PostStringField[CollectionName]
        NumberField: Pruvious.PostNumberField[CollectionName]
        BooleanField: Pruvious.PostBooleanField[CollectionName]
      }>,
): PostQuery<CollectionName> {
  return new PostQuery(collection, params)
}

/**
 * Validate post field inputs.
 *
 * Default mode is `create`.
 *
 * @example
 * ```js
 * @todo
 * ```
 */
export async function validatePostFields<CollectionName extends Pruvious.Collection>(
  collection: string,
  fields: Partial<Pruvious.PostInput[CollectionName]>,
  mode: 'create' | 'update' = 'create',
): Promise<ValidationResults> {
  const data: Record<string, any> = { meta: {} }

  standardCollectionFields.forEach((field) => {
    if (fields[field.name] !== undefined) {
      data[field.name] = fields[field.name]
    }
  })

  if (collectionsConfig[collection].fields) {
    flattenFields(collectionsConfig[collection].fields!).forEach((field) => {
      data.meta[field.name] =
        fields[field.name] === undefined ? getDefaultFieldValue(field) : fields[field.name]
    })
  }

  if (mode === 'create' && fields.translationOf) {
    data.translationOf = fields.translationOf
  }

  try {
    return {
      success: true,
      data: await validator.validate(
        new PostValidator(collection, data, mode, mode === 'update' ? data.id : undefined),
      ),
    }
  } catch (e) {
    return {
      success: false,
      errors: Object.entries(e.messages).map(([field, messages]: [string, string[]]) => ({
        field,
        message: messages[0],
      })),
    }
  }
}

/**
 * Create a new post.
 *
 * @example
 * ```js
 * await createPost({}) @todo
 * ```
 */
export async function createPost<CollectionName extends Pruvious.Collection>(
  collection: CollectionName,
  fields: CDFields<
    Pruvious.PostInput[CollectionName],
    Pruvious.CreatablePostField[CollectionName],
    Pruvious.RequiredPostField[CollectionName],
    Pruvious.StandardPostField
  >,
  returnOptions?: ReturnOptions<Pruvious.ComputedPostField>,
): Promise<
  | { success: true; data: PostResult<CollectionName> }
  | { success: false; errors: ValidationError[] }
> {
  const query = queryPosts(collection)
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))

  if (returnOptions?.populate !== false) {
    query.populate()
  }

  return (query as any)._create(fields)
}

/**
 * Fetch a post based on its collection name and ID.
 *
 * @example
 * ```js
 * await getPost(1) @todo
 * ```
 */
export async function getPost<CollectionName extends Pruvious.Collection>(
  collection: CollectionName,
  postId: number,
  returnOptions?: ReturnOptions<Pruvious.ComputedPostField>,
): Promise<PostResult<CollectionName> | null> {
  const query = queryPosts(collection)
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .language('*')
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))
    .where('id', postId as any)

  if (returnOptions?.populate !== false) {
    query.populate()

    if ((returnOptions as any)?._skipPopulate) {
      ;(query as any)._skipPopulate = (returnOptions as any)._skipPopulate
    }
  }

  return query.first()
}

/**
 * @todo
 */
export async function getAnyPost(
  postId: number,
  returnOptions?: ReturnOptions<Pruvious.ComputedPostField>,
): Promise<Partial<PostRecord> | null> {
  const post = await Database.from('posts').select('collection').where('id', postId).first()

  if (!post) {
    return null
  }

  const query = queryPosts(post.collection)
    .select(...(Array.isArray(returnOptions?.fields) ? returnOptions!.fields : ['*']))
    .language('*')
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))
    .where('id', postId)

  if (returnOptions?.populate !== false) {
    query.populate()

    if ((returnOptions as any)?._skipPopulate) {
      ;(query as any)._skipPopulate = (returnOptions as any)._skipPopulate
    }
  }

  return query.first()
}

/**
 * Update a post based on its collection name and ID.
 *
 * Returns `null` if the post does not exist.
 *
 * @example
 * ```js
 * await updatePost(1, {}) @todo
 * ```
 */
export async function updatePost<CollectionName extends Pruvious.Collection>(
  collection: CollectionName,
  postId: number,
  fields: UFields<Pruvious.PostInput[CollectionName], Pruvious.UpdateablePostField[CollectionName]>,
  returnOptions?: ReturnOptions<Pruvious.ComputedPostField>,
): Promise<UpdateResult<PostResult<CollectionName>> | null> {
  const query = queryPosts(collection)
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .language('*')
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))
    .where('id', postId as any)

  if (returnOptions?.populate !== false) {
    query.populate()
  }

  const results = await query.update(fields)

  return results[0] ?? null
}

/**
 * Delete a post based on its collection name and ID.
 *
 * @example
 * ```js
 * await deletePost(1) @todo
 * ```
 */
export async function deletePost<CollectionName extends Pruvious.Collection>(
  collection: CollectionName,
  postId: number,
): Promise<boolean> {
  const results = await queryPosts(collection)
    .language('*')
    .where('id', postId as any)
    .delete()
  return !!results.length
}

/**
 * @todo
 */
export async function getPostTranslations(
  postId: number,
): Promise<Record<string, { id: number } | null>> {
  return (await getTranslations('posts', postId, true)) as any
}
