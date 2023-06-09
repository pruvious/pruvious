import { validator } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import {
  BlockRecord,
  CDFields,
  QueryStringParameters,
  ReturnOptions,
  SFields,
  UFields,
  UpdateResult,
  ValidationError,
  ValidationResults,
  flattenFields,
  getAllowedPageBlocks,
  getDefaultFieldValue,
  getFieldValueType,
  nanoid,
  sanitizeAllowedBlocks,
  standardPageColumns,
  standardPageFields,
} from '@pruvious/shared'
import { Pruvious } from '@pruvious/types'
import { trimAll } from '@pruvious/utils'
import Page from 'App/Models/Page'
import Translation from 'App/Models/Translation'
import PageValidator from 'App/Validators/PageValidator'
import { blocks, config, pageConfig } from 'App/imports'
import { populatePage } from 'App/populator'
import { getTranslations } from 'App/translations'
import { DateTime } from 'luxon'
import { BaseQuery, prepareFieldValue } from './BaseQuery'
import { getMetaFields } from './model-utils'
import { addInternalJob } from './worker'

type PageResult = SFields<
  Pruvious.Page,
  Pruvious.PageInput,
  Pruvious.SelectablePageField | Pruvious.ComputedPageField
>

type QueryString = QueryStringParameters<{
  LanguageCode: Pruvious.LanguageCode
  Model: Pruvious.PageInput
  SelectableField: Pruvious.SelectablePageField
  SortableField: Pruvious.SortablePageField
  FilterableField: Pruvious.FilterablePageField
  StringField: Pruvious.PageStringField
  NumberField: Pruvious.PageNumberField
  BooleanField: Pruvious.PageBooleanField
}>

type T = {
  Input: Pruvious.PageInput
  Result: PageResult
  PopulatedResult: Pruvious.Page
  ComputedField: Pruvious.ComputedPageField
  SelectableField: Pruvious.SelectablePageField
  SortableField: Pruvious.SortablePageField
  FilterableField: Pruvious.FilterablePageField
  StringField: Pruvious.PageStringField
  NumberField: Pruvious.PageNumberField
  BooleanField: Pruvious.PageBooleanField
  LanguageCode: Pruvious.LanguageCode
}

export class PageQuery extends BaseQuery<T> {
  constructor(params?: string | QueryString) {
    super()

    this.table = 'pages'

    this.query = Page.query()

    this.columns = standardPageColumns

    this.fields.push(...standardPageFields)

    this.relations.push('draftToken', 'translations', 'url')

    this.createHook = pageConfig.onCreate
    this.readHook = pageConfig.onRead
    this.populateHook = pageConfig.onPopulate
    this.updateHook = pageConfig.onUpdate
    this.deleteHook = pageConfig.onDelete

    if (pageConfig.fields) {
      flattenFields(pageConfig.fields).forEach((field) => {
        this.metaColumns[field.name] = getFieldValueType(field)
        this.fields.push(field)
      })
    }

    if (pageConfig.listing?.perPage) {
      this.perPage = pageConfig.listing.perPage
    }

    if (pageConfig.perPageLimit) {
      this.perPageLimit = pageConfig.perPageLimit
    }

    if (typeof params === 'string') {
      this.fromQueryString(params)
    } else if (typeof params === 'object') {
      this.apply(params)
    }
  }

  /**
   * Apply filters, selected fields, locales, and sort and pagination parameters from a query string `value`.
   *
   * @example
   * ```js
   * await queryPages().fromQueryString('sort=createdAt:desc&filters[path][$startsWith]=%2Farticles%2F')
   *
   * // Alternative 1:
   * await queryPages().apply({ sort: 'createdAt:desc', filters: { path: { $startsWith: '/articles/' } } })
   *
   * // Alternative 2:
   * await queryPages().whereLike('path', '/articles/%').orderBy('createdAt', 'desc')
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
   * await queryPages().apply({ sort: 'createdAt:desc', filters: { path: { $startsWith: 'articles/' } } })
   *
   * // Alternative 1:
   * await queryPages().fromQueryString('sort=createdAt:desc&filters[path][$startsWith]=articles%2F')
   *
   * // Alternative 2:
   * await queryPages().whereLike('path', 'articles/%').orderBy('createdAt', 'desc')
   * ```
   */
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
    return super.apply(params)
  }

  /**
   * Return pages for a specific language `code`.
   *
   * @example
   * ```js
   * await queryPages().language('de').all() // Returns all pages in German
   * await queryPages().language('*').all() // Returns all pages
   * ```
   */
  language(code: Pruvious.LanguageCode | '*'): this {
    return this.setLanguage(code)
  }

  /**
   * An array of field names that will be returned in the query results.
   * Use a wildcard (*) to select all fields.
   *
   * @example
   * ```js
   * await queryPages().select('id', 'public', 'path').all()
   * // [{ id: 1, public: true, path: '/' }]
   * ```
   */
  select(...fields: (T['SelectableField'] | '*')[]): this {
    return super.select(...fields)
  }

  protected prepareSelect() {
    if (this.aliasedMetaColumns.size) {
      const select: any[] = ['pages.*', 'page_meta.key', 'page_meta.value', ...this.keywordSelects]

      this.aliasedMetaColumns.forEach((column) => {
        const sql =
          this.metaColumns[column] === 'string'
            ? `max(case when page_meta.key = '${column}' then page_meta.value end) as \`${column}\``
            : `max(case when page_meta.key = '${column}' then cast(page_meta.value as numeric) end) as \`${column}\``

        select.push(Database.raw(sql))
      })

      this.query = this.query
        .leftJoin('page_meta', 'pages.id', 'page_meta.page_id')
        .groupBy('pages.id')
        .select(...select)
    } else {
      this.query = this.query.select('*', ...this.keywordSelects)
    }

    return this.query
  }

  protected async populateRecord(page: PageResult) {
    await populatePage(page as any, this._skipPopulate)
  }

  /**
   * Retrieve a page by its ID.
   *
   * @example
   * ```js
   * await queryPages().find(1)
   * ```
   */
  async find(id: number): Promise<PageResult | null> {
    const page = await Page.find(id)
    return page ? await this.serialize(page) : null
  }

  /**
   * Find a page based on a specific field-value pair.
   *
   * @example
   * ```js
   * await queryPages().findBy('path', '/')
   * ```
   */
  async findBy<FieldName extends Pruvious.FilterablePageField>(
    field: FieldName,
    value: Exclude<Pruvious.PageInput[FieldName], null>,
  ): Promise<PageResult | null> {
    const pages = await this.$where('', 'and', field, value, Page.query())
      .orderBy('id', 'desc')
      .limit(1)

    return pages.length ? await this.serialize(pages[0]) : null
  }

  protected sanitizePath(value: string): string {
    return value === '/' ? value : trimAll(value).replace(/\/\/*/g, '/').replace(/\/*$/, '')
  }

  /**
   * Define a `where` clause in SQL queries by specifying a field name and a corresponding value to filter the query results.
   *
   * @example
   * ```js
   * await queryPages().where('path', '/').first()
   * ```
   */
  where<
    FieldName extends T['FilterableField'] &
      (T['StringField'] | T['NumberField'] | T['BooleanField']),
  >(field: FieldName, value: Exclude<T['Input'][FieldName], null>): this {
    return super.where(field, value)
  }

  /**
   * Refine the `where` clause in SQL queries using the `AND` operator by specifying a field name and a corresponding value to filter the query results.
   *
   * @alias where
   * @example
   * ```js
   * await queryPages().where('path', '/').andWhere('public', true).first()
   * ```
   */
  andWhere<
    FieldName extends T['FilterableField'] &
      (T['StringField'] | T['NumberField'] | T['BooleanField']),
  >(field: FieldName, value: Exclude<T['Input'][FieldName], null>): this {
    return super.andWhere(field, value)
  }

  protected async _create(
    fields: CDFields<
      Pruvious.PageInput,
      Pruvious.CreatablePageField,
      Pruvious.RequiredPageField,
      Pruvious.StandardPageField
    >,
  ): Promise<{ success: true; data: PageResult } | { success: false; errors: ValidationError[] }> {
    if (this.createHook) {
      await this.createHook(fields)
    }

    const fieldsToValidate = { ...fields }

    if (fieldsToValidate.sharingImage === undefined) {
      fieldsToValidate.sharingImage = null
    }

    const validationResults = await validatePageFields(fieldsToValidate)

    if (validationResults.success) {
      let draftToken: string
      let translationId: number | undefined

      const records = validationResults.data
      const metaEntries = validationResults.data.meta
        ? flattenFields(pageConfig.fields ?? []).map((field) => ({
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

      do {
        draftToken = nanoid()
      } while (await Page.findBy('draft_token', draftToken))

      const isPublic = prepareFieldValue(records.public, false)
      const page = await Page.create({
        public: isPublic,
        path: this.sanitizePath(records.path),
        language: prepareFieldValue(records.language, config.defaultLanguage).trim(),
        translationId: translationId || (await Translation.create({})).id,
        title: trimAll(prepareFieldValue(records.title, '')),
        baseTitle: prepareFieldValue(records.baseTitle, true),
        description: trimAll(prepareFieldValue(records.description, '')),
        visible: prepareFieldValue(records.visible, true),
        sharingImage: prepareFieldValue(records.sharingImage, null),
        metaTags: prepareFieldValue(records.metaTags, []),
        type: prepareFieldValue(records.type, 'default').trim(),
        layout: prepareFieldValue(records.layout, 'default').trim(),
        blocks: prepareFieldValue(records.blocks, []),
        blocksBackup: null,
        draftToken,
        publishDate: prepareFieldValue(records.publishDate, isPublic ? DateTime.now() : null),
      })

      await page.refresh()

      if (metaEntries.length) {
        await page.related('meta').updateOrCreateMany(metaEntries, 'key')
        await page.load('meta')
      }

      await page.safeRebuildRelations()
      await addInternalJob('flush', 'Page', page.id)

      return { success: true, data: await this.serialize(page) }
    }

    return validationResults
  }

  /**
   * Update the selected pages.
   *
   * @example
   * ```js
   * @todo
   * ```
   */
  async update(
    fields: UFields<Pruvious.PageInput, Pruvious.UpdateablePageField>,
  ): Promise<UpdateResult<PageResult>[]> {
    const results: UpdateResult<PageResult>[] = []
    const pages: Page[] = await this.prepare().exec()

    if (this.updateHook) {
      await this.updateHook(fields)
    }

    for (const page of pages) {
      const fieldsToValidate: Record<string, any> = {
        ...(await getMetaFields(page, pageConfig)),
        ...fields,
        id: page.id,
      }

      for (const column of Object.keys(this.columns)) {
        if (fieldsToValidate[column] === undefined) {
          fieldsToValidate[column] = page[column]
        }
      }

      const validationResults = await validatePageFields(fieldsToValidate, 'update')

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
        const isPublic = prepareFieldValue(records.public, page.public)

        page.merge({
          public: isPublic,
          path: this.sanitizePath(prepareFieldValue(records.path, page.path)),
          title: trimAll(prepareFieldValue(fields.title, page.title)),
          baseTitle: prepareFieldValue(records.baseTitle, page.baseTitle),
          description: trimAll(prepareFieldValue(fields.description, page.description)),
          visible: prepareFieldValue(records.visible, page.visible),
          sharingImage: prepareFieldValue(records.sharingImage, page.sharingImage),
          metaTags: prepareFieldValue(records.metaTags, page.metaTags),
          type: prepareFieldValue(records.type, page.type).trim(),
          layout: prepareFieldValue(records.layout, page.layout).trim(),
          blocks: prepareFieldValue(records.blocks, page.blocks),
          blocksBackup: null,
          publishDate: prepareFieldValue(fields.publishDate, isPublic ? DateTime.now() : null),
        })

        await page.save()
        await page.refresh()

        for (const metaEntry of metaEntries) {
          await page.related('meta').updateOrCreate({ key: metaEntry.key }, metaEntry)
        }

        await page.load('meta')
        await page.safeRebuildRelations()
        await addInternalJob('flush', 'Page', page.id)

        results.push({
          success: true,
          data: await this.serialize(page),
        })
      } else {
        results.push({
          success: false,
          data: await this.serialize(page),
          errors: validationResults.errors,
        })
      }
    }

    return results
  }

  /**
   * Delete the selected pages.
   *
   * @example
   * ```js
   * @todo
   * ```
   */
  async delete(): Promise<number[]> {
    const deleted: number[] = []
    const pages: Page[] = await this.prepare().exec()

    for (const page of pages) {
      if (this.deleteHook) {
        await this.deleteHook(page.id)
      }

      await page.$relation('translation')

      const translation = page.translation

      await page.delete()
      await translation.load('pages')

      if (!translation.pages.length) {
        await translation.delete()
      }

      deleted.push(page.id)
    }

    return deleted
  }
}

/**
 * Create a query builder instance for pages.
 *
 * @todo example
 */
export function queryPages(params?: string | QueryString): PageQuery {
  return new PageQuery(params)
}

/**
 * Validate page field inputs.
 *
 * Default mode is `create`.
 *
 * @example
 * ```js
 * @todo
 * ```
 */
export async function validatePageFields(
  fields: Partial<Pruvious.PageInput>,
  mode: 'create' | 'update' = 'create',
): Promise<ValidationResults> {
  const data: Record<string, any> = { meta: {} }

  standardPageFields.forEach((field) => {
    if (fields[field.name] !== undefined) {
      data[field.name] = fields[field.name]
    }
  })

  if (pageConfig.fields) {
    flattenFields(pageConfig.fields).forEach((field) => {
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
        new PageValidator(
          data,
          mode,
          typeof fields.type === 'string' ? fields.type : '',
          mode === 'update' ? data.id : undefined,
        ),
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
 * Create a new page.
 *
 * @example
 * ```js
 * await createPage({}) @todo
 * ```
 */
export async function createPage(
  fields: CDFields<
    Pruvious.PageInput,
    Pruvious.CreatablePageField,
    Pruvious.RequiredPageField,
    Pruvious.StandardPageField
  >,
  returnOptions?: ReturnOptions<Pruvious.ComputedPageField>,
): Promise<{ success: true; data: PageResult } | { success: false; errors: ValidationError[] }> {
  const query = queryPages()
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))

  if (returnOptions?.populate !== false) {
    query.populate()
  }

  return (query as any)._create(fields)
}

/**
 * Fetch a page based on its ID.
 *
 * @example
 * ```js
 * await getPage(1) @todo
 * ```
 */
export async function getPage(
  pageId: number,
  returnOptions?: ReturnOptions<Pruvious.ComputedPageField>,
): Promise<PageResult | null> {
  const query = queryPages()
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .language('*')
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))
    .where('id', pageId)

  if (returnOptions?.populate !== false) {
    query.populate()

    if ((returnOptions as any)?._skipPopulate) {
      ;(query as any)._skipPopulate = (returnOptions as any)._skipPopulate
    }
  }

  return query.first()
}

/**
 * Update a page based on its ID.
 *
 * Returns `null` if the page does not exist.
 *
 * @example
 * ```js
 * await updatePage(1, {}) @todo
 * ```
 */
export async function updatePage(
  pageId: number,
  fields: UFields<Pruvious.PageInput, Pruvious.UpdateablePageField>,
  returnOptions?: ReturnOptions<Pruvious.ComputedPageField>,
): Promise<UpdateResult<PageResult> | null> {
  const query = queryPages()
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .language('*')
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))
    .where('id', pageId)

  if (returnOptions?.populate !== false) {
    query.populate()
  }

  const results = await query.update(fields)

  return results[0] ?? null
}

/**
 * Delete a page based on its ID.
 *
 * @example
 * ```js
 * await deletePage(1) @todo
 * ```
 */
export async function deletePage(pageId: number): Promise<boolean> {
  const results = await queryPages().language('*').where('id', pageId).delete()
  return !!results.length
}

/**
 * @todo
 */
export async function getPageTranslations(
  pageId: number,
): Promise<Record<string, { id: number; path: string; url: string } | null>> {
  return (await getTranslations('pages', pageId, true)) as any
}

/**
 * Get the URL with the unique draft token if the page is in draft mode,
 * otherwise return the normal URL.
 *
 * @example
 * ```js
 * await getPageDraftUrl(1) // https://localhost:3000/?__d=XXXXXXXXXXXXXXXXXXXXX
 * ```
 */
export async function getPageDraftUrl(pageId: number): Promise<string | null> {
  const page = await getPage(pageId, { with: ['draftToken', 'url'] })
  return page ? (page.public ? page.url! : `${page.url}?__d=${page.draftToken}`) : null
}

/**
 * @todo
 */
export function sanitizeAllowedPageBlocks(
  page: Pick<Pruvious.Page, 'blocks' | 'layout' | 'type'>,
): {
  sanitizedBlockRecords: BlockRecord[]
  errors: { blockId: string; message: string }[]
} {
  const { allowedBlocks, rootBlocks } = getAllowedPageBlocks(page, pageConfig, blocks)
  return sanitizeAllowedBlocks(page.blocks, blocks, allowedBlocks, rootBlocks)
}
