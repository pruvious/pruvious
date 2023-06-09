import { MultipartFileContract } from '@ioc:Adonis/Core/BodyParser'
import { rules, schema, validator } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import {
  CFields,
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
  nanoid,
  standardUploadColumns,
  standardUploadFields,
} from '@pruvious-test/shared'
import { Pruvious } from '@pruvious-test/types'
import { slugify, trimAll } from '@pruvious-test/utils'
import Upload from 'App/Models/Upload'
import UploadValidator from 'App/Validators/UploadValidator'
import { uploadConfig } from 'App/imports'
import { populateUpload } from 'App/populator'
import md5File from 'md5-file'
import sharp from 'sharp'
import { BaseQuery, prepareFieldValue } from './BaseQuery'
import Directory from './Models/Directory'
import { getMetaFields } from './model-utils'
import { addInternalJob } from './worker'

export type UploadResult = SFields<
  Pruvious.Upload,
  Pruvious.UploadInput,
  Pruvious.SelectableUploadField | Pruvious.ComputedUploadField
>

type QueryString = QueryStringParameters<{
  LanguageCode: never
  Model: Pruvious.UploadInput
  SelectableField: Pruvious.SelectableUploadField
  SortableField: Pruvious.SortableUploadField
  FilterableField: Pruvious.FilterableUploadField
  StringField: Pruvious.UploadStringField
  NumberField: Pruvious.UploadNumberField
  BooleanField: Pruvious.UploadBooleanField
}>

type T = {
  Input: Pruvious.UploadInput
  Result: UploadResult
  PopulatedResult: Pruvious.Upload
  ComputedField: Pruvious.ComputedUploadField
  SelectableField: Pruvious.SelectableUploadField
  SortableField: Pruvious.SortableUploadField
  FilterableField: Pruvious.FilterableUploadField
  StringField: Pruvious.UploadStringField
  NumberField: Pruvious.UploadNumberField
  BooleanField: Pruvious.UploadBooleanField
  LanguageCode: never
}

export class UploadQuery extends BaseQuery<T> {
  constructor(params?: string | QueryString) {
    super()

    this.table = 'uploads'

    this.query = Upload.query()

    this.columns = standardUploadColumns

    this.fields.push(...standardUploadFields)

    this.translatable = false

    this.relations.push('directory', 'url')

    this.createHook = uploadConfig.onCreate
    this.readHook = uploadConfig.onRead
    this.populateHook = uploadConfig.onPopulate
    this.updateHook = uploadConfig.onUpdate
    this.deleteHook = uploadConfig.onDelete

    if (uploadConfig.fields) {
      flattenFields(uploadConfig.fields).forEach((field) => {
        this.metaColumns[field.name] = getFieldValueType(field)
        this.fields.push(field)
      })
    }

    if (uploadConfig.perPageLimit) {
      this.perPageLimit = uploadConfig.perPageLimit
    }

    if (typeof params === 'string') {
      this.fromQueryString(params)
    } else if (typeof params === 'object') {
      this.apply(params)
    }
  }

  /**
   * Apply filters, selected fields, and sort and pagination parameters from a query string `value`.
   *
   * @example
   * ```js
   * await queryUploads().fromQueryString('sort=name:asc&filters[kind][$eq]=image')
   *
   * // Alternative 1:
   * await queryUploads().apply({ sort: 'name:asc', filters: { kind: { $eq: 'image' } } })
   *
   * // Alternative 2:
   * await queryUploads().where('kind', 'image').orderBy('name', 'asc')
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
   * await queryUploads().apply({ sort: 'name:asc', filters: { kind: { $eq: 'image' } } })
   *
   * // Alternative 1:
   * await queryUploads().fromQueryString('sort=name:asc&filters[kind][$eq]=image')
   *
   * // Alternative 2:
   * await queryUploads().where('kind', 'image').orderBy('name', 'asc')
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
   * An array of field names that will be returned in the query results.
   * Use a wildcard (*) to select all fields.
   *
   * @example
   * ```js
   * await queryUploads().select('id', 'path', 'kind').all()
   * // [{ id: 1, path: 'favicon.svg', kind: 'image' }]
   * ```
   */
  select(...fields: (T['SelectableField'] | '*')[]): this {
    return super.select(...fields)
  }

  protected prepareSelect() {
    if (this.aliasedMetaColumns.size) {
      const select: any[] = [
        'uploads.*',
        'upload_meta.key',
        'upload_meta.value',
        ...this.keywordSelects,
      ]

      this.aliasedMetaColumns.forEach((column) => {
        const sql =
          this.metaColumns[column] === 'string'
            ? `max(case when upload_meta.key = '${column}' then upload_meta.value end) as \`${column}\``
            : `max(case when upload_meta.key = '${column}' then cast(upload_meta.value as numeric) end) as \`${column}\``

        select.push(Database.raw(sql))
      })

      this.query = this.query
        .leftJoin('upload_meta', 'uploads.id', 'upload_meta.upload_id')
        .groupBy('uploads.id')
        .select(...select)
    } else {
      this.query = this.query.select('*', ...this.keywordSelects)
    }

    return this.query
  }

  protected async populateRecord(upload: UploadResult) {
    await populateUpload(upload as any, this._skipPopulate)
  }

  /**
   * Retrieve an upload by its ID.
   *
   * @example
   * ```js
   * await queryUploads().find(1)
   * { id: 1 }
   * ```
   */
  async find(id: number): Promise<UploadResult | null> {
    const upload = await Upload.find(id)
    return upload ? await this.serialize(upload) : null
  }

  /**
   * Find an upload based on a specific field-value pair.
   *
   * @example
   * ```js
   * await queryUploads().findBy('path', 'favicon.svg')
   * ```
   */
  async findBy<FieldName extends Pruvious.FilterableUploadField>(
    field: FieldName,
    value: Exclude<Pruvious.UploadInput[FieldName], null>,
  ): Promise<UploadResult | null> {
    const uploads = await this.$where('', 'and', field, value, Upload.query())
      .orderBy('id', 'desc')
      .limit(1)

    return uploads.length ? await this.serialize(uploads[0]) : null
  }

  /**
   * Define a `where` clause in SQL queries by specifying a field name and a corresponding value to filter the query results.
   *
   * @example
   * ```js
   * await queryUploads().where('path', 'favicon.svg').first()
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
   * await queryUploads().where('kind', 'image').andWhere('size', 4096).first()
   * ```
   */
  andWhere<
    FieldName extends T['FilterableField'] &
      (T['StringField'] | T['NumberField'] | T['BooleanField']),
  >(field: FieldName, value: Exclude<T['Input'][FieldName], null>): this {
    return super.andWhere(field, value)
  }

  protected async _create(
    file: MultipartFileContract,
    fields: CFields<
      Pruvious.UploadInput,
      Pruvious.CreatableUploadField,
      Pruvious.RequiredUploadField
    >,
  ): Promise<
    { success: true; data: UploadResult } | { success: false; errors: ValidationError[] }
  > {
    if (this.createHook) {
      await this.createHook({ ...fields, file })
    }

    const validationResults = await validateUploadFields({ ...fields, file, name: undefined })

    if (validationResults.success) {
      const records = validationResults.data
      const metaEntries = validationResults.data.meta
        ? flattenFields(uploadConfig.fields ?? []).map((field) => ({
            key: field.name,
            value: prepareFieldValue(
              validationResults.data.meta[field.name],
              getDefaultFieldValue(field, 'meta'),
            ),
          }))
        : []

      const pathParts = (fields.name || file.clientName)
        .split('/')
        .map((pathPart) => pathPart.trim())
        .filter(Boolean)
      const nameParts = pathParts
        .pop()!
        .replace(/--o--/g, '-')
        .split('.')
        .map(trimAll)
        .map((namePart: string) => slugify(namePart))
      const extension = nameParts.length > 1 ? `.${nameParts.pop()}` : ''
      const kind = file.type?.slice(0, 255).split('/')[0]

      let info = {}
      let baseName = nameParts.join('.').slice(0, 255 - extension.length)

      if (kind === 'image') {
        try {
          info = await sharp(file.tmpPath).metadata()
        } catch (_) {}
      }

      if (!fields.directoryId && pathParts.length) {
        let directoryId: number | undefined = undefined

        for (const pathPart of pathParts
          .map(trimAll)
          .map((pathPart: string) => slugify(pathPart))) {
          const directoryQuery = Directory.query().where('name', pathPart)
          const directory = directoryId
            ? await directoryQuery.andWhere('directory_id', directoryId).first()
            : await directoryQuery.andWhereNull('directory_id').first()

          if (directory) {
            directoryId = directory.id
          } else {
            directoryId = (await Directory.create({ name: pathPart, directoryId })).id
          }
        }

        fields.directoryId = directoryId
      }

      while (
        fields.directoryId
          ? await Upload.query()
              .where('name', baseName + extension)
              .andWhere('directoryId', fields.directoryId)
              .first()
          : await Upload.query()
              .where('name', baseName + extension)
              .andWhereNull('directoryId')
              .first()
      ) {
        if (baseName.length + extension.length > 253) {
          baseName = nanoid().toLowerCase()
        } else {
          const match = baseName.match(/-([0-9]+)$/)

          if (match) {
            baseName = baseName.replace(/[0-9]+$/, (+match[1] + 1).toString())
          } else if (baseName) {
            baseName += '-1'
          } else {
            baseName = 'copy'
          }
        }
      }

      try {
        await validator.validate({
          schema: schema.create({ name: schema.string([rules.pathPart()]) }),
          data: { name: baseName + extension },
        })
      } catch (e) {
        return {
          success: false,
          errors: Object.keys(e.messages).map((field) => ({
            field,
            message: e.messages[field][0],
            rule: '',
          })),
        }
      }

      const upload = await Upload.create({
        mime: ((file.type ?? '') + (file.subtype ? `/${file.subtype}` : '')).slice(0, 255),
        kind: kind && ['audio', 'font', 'image', 'text', 'video'].includes(kind) ? kind : 'other',
        name: baseName + extension,
        directoryId: fields.directoryId ?? null,
        description: trimAll(prepareFieldValue(records.description, '')),
        info,
        size: file.size,
        hash: file.tmpPath ? await md5File(file.tmpPath) : null,
      })

      await upload.refresh()
      await upload.generateThumbnail(file.tmpPath)
      await upload.load('directory')
      await file.moveToDisk(`./${upload.directory?.path ?? ''}`, { name: upload.name })

      if (metaEntries.length) {
        await upload.related('meta').updateOrCreateMany(metaEntries, 'key')
        await upload.load('meta')
      }

      await upload.safeRebuildRelations()
      await addInternalJob('flush', 'Upload', upload.id)

      return { success: true, data: await this.serialize(upload) }
    }

    return validationResults
  }

  /**
   * Update the selected uploads.
   *
   * @todo
   * @example
   * ```js
   * await queryUploads().where('id', 1).update({ email: 'new@pruvious.com' })
   * // [{ success: true; data: { id: 1 } }]
   * ```
   */
  async update(
    fields: UFields<Pruvious.UploadInput, Pruvious.UpdateableUploadField>,
  ): Promise<UpdateResult<UploadResult>[]> {
    const results: UpdateResult<UploadResult>[] = []
    const uploads: Upload[] = await this.prepare().exec()

    if (this.updateHook) {
      await this.updateHook(fields)
    }

    for (const upload of uploads) {
      const fieldsToValidate: Record<string, any> = {
        ...(await getMetaFields(upload, uploadConfig)),
        ...fields,
        id: upload.id,
      }

      for (const column of Object.keys(this.columns)) {
        if (fieldsToValidate[column] === undefined) {
          fieldsToValidate[column] = upload[column]
        }
      }

      const validationResults = await validateUploadFields(fieldsToValidate, 'update')

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

        upload.merge({
          name: trimAll(prepareFieldValue(fields.name, upload.name)),
          directoryId: prepareFieldValue(records.directoryId, upload.directoryId),
          description: trimAll(prepareFieldValue(fields.description, upload.description)),
        })

        await upload.save()
        await upload.resolvePathCascade()
        await upload.refresh()

        for (const metaEntry of metaEntries) {
          await upload.related('meta').updateOrCreate({ key: metaEntry.key }, metaEntry)
        }

        await upload.load('meta')
        await upload.safeRebuildRelations()
        await addInternalJob('flush', 'Upload', upload.id)

        results.push({
          success: true,
          data: await this.serialize(upload),
        })
      } else {
        results.push({
          success: false,
          data: await this.serialize(upload),
          errors: validationResults.errors,
        })
      }
    }

    return results
  }

  /**
   * Delete the selected uploads.
   *
   * @todo
   * @example
   * ```js
   * await queryUploads().whereLt('createdAt', '2023-01-01').delete()
   * // Deletes all users created before the year 2023
   * ```
   */
  async delete(): Promise<number[]> {
    const deleted: number[] = []
    const uploads: Upload[] = await this.prepare().exec()

    for (const upload of uploads) {
      if (this.deleteHook) {
        await this.deleteHook(upload.id)
      }

      await upload.delete()
      deleted.push(upload.id)
    }

    return deleted
  }
}

/**
 * Create a query builder instance for uploads.
 *
 * @todo example
 */
export function queryUploads(params?: string | QueryString): UploadQuery {
  return new UploadQuery(params)
}

/**
 * Validate upload field inputs.
 *
 * Default mode is `create`.
 *
 * @todo
 * @example
 * ```js
 * await validateUploadFields({ email: 'user-1' })
 * // { success: false, errors: [{ field: 'email', message: 'The entered email address is not valid' }] }
 *
 * await validateUploadFields({ email: 'user-1@pruvious.com' })
 * // { success: true }
 *
 * await validateUploadFields({ id: 2, email: 'user-1@pruvious.com' }, 'update')
 * // { success: false, errors: [{ field: 'email', message: 'The email is already taken' }] }
 * ```
 */
export async function validateUploadFields(
  fields: Partial<Pruvious.UploadInput> & { file?: MultipartFileContract },
  mode: 'create' | 'update' = 'create',
): Promise<ValidationResults> {
  const data: Record<string, any> = { file: fields.file, meta: {} }

  standardUploadFields.forEach((field) => {
    if (fields[field.name] !== undefined) {
      data[field.name] = fields[field.name]
    }
  })

  if (uploadConfig.fields) {
    flattenFields(uploadConfig.fields).forEach((field) => {
      data.meta[field.name] =
        fields[field.name] === undefined ? getDefaultFieldValue(field) : fields[field.name]
    })
  }

  try {
    return {
      success: true,
      data: await validator.validate(
        new UploadValidator(data, mode, mode === 'update' ? data.id : undefined),
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
 * Create a new upload.
 *
 * @todo
 * @example
 * ```js
 * await createUpload(file, {}) @todo
 * ```
 */
export async function createUpload(
  file: MultipartFileContract,
  fields: CFields<
    Pruvious.UploadInput,
    Pruvious.CreatableUploadField,
    Pruvious.RequiredUploadField
  >,
  returnOptions?: ReturnOptions<Pruvious.ComputedUploadField>,
): Promise<{ success: true; data: UploadResult } | { success: false; errors: ValidationError[] }> {
  const query = queryUploads()
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))

  if (returnOptions?.populate !== false) {
    query.populate()
  }

  return (query as any)._create(file, fields)
}

/**
 * Fetch an upload based on its ID.
 *
 * @example
 * ```js
 * await getUpload(1) @todo
 * ```
 */
export async function getUpload(
  uploadId: number,
  returnOptions?: ReturnOptions<Pruvious.ComputedUploadField>,
): Promise<UploadResult | null> {
  const query = queryUploads()
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))
    .where('id', uploadId)

  if (returnOptions?.populate !== false) {
    query.populate()

    if ((returnOptions as any)?._skipPopulate) {
      ;(query as any)._skipPopulate = (returnOptions as any)._skipPopulate
    }
  }

  return query.first()
}

/**
 * Update an upload based on its ID.
 *
 * Returns `null` if the upload does not exist.
 *
 * @example
 * ```js
 * await updateUpload(1, {}) @todo
 * ```
 */
export async function updateUpload(
  uploadId: number,
  fields: UFields<Pruvious.UploadInput, Pruvious.UpdateableUploadField>,
  returnOptions?: ReturnOptions<Pruvious.ComputedUploadField>,
): Promise<UpdateResult<UploadResult> | null> {
  const query = queryUploads()
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))
    .where('id', uploadId)

  if (returnOptions?.populate !== false) {
    query.populate()
  }

  const results = await query.update(fields)

  return results[0] ?? null
}

/**
 * Delete an upload based on its ID.
 *
 * @example
 * ```js
 * await deleteUpload(1) @todo
 * ```
 */
export async function deleteUpload(uploadId: number): Promise<boolean> {
  const results = await queryUploads().where('id', uploadId).delete()
  return !!results.length
}
