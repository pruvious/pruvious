import {
  imageTypes,
  type CastedFieldType,
  type CreateInput,
  type SelectableFieldName,
  type UpdateInput,
} from '#pruvious'
import { collections } from '#pruvious/server'
import fs from 'fs-extra'
import path from 'path'
import { Op } from 'sequelize'
import { db } from '../instances/database'
import { s3DeleteObject, s3MoveObject, s3PutObject } from '../instances/s3'
import { getModuleOption } from '../instances/state'
import { format } from '../utils/bytes'
import { objectOmit, objectPick } from '../utils/object'
import { __ } from '../utils/server/translate-string'
import { joinRouteParts } from '../utils/string'
import { generateImagePaths, getOptimizedImage } from './images'
import {
  QueryBuilder,
  type CreateManyResult,
  type CreateResult,
  type UpdateResult,
  type ValidationError,
} from './query-builder'

export class UploadsQueryBuilder<
  ReturnableFieldName extends SelectableFieldName['uploads'] = SelectableFieldName['uploads'],
  ReturnedFieldType extends Record<keyof CastedFieldType['uploads'], any> = CastedFieldType['uploads'],
> extends QueryBuilder<'uploads'> {
  /**
   * Create a new 'uploads' collection record using the provided `input` data.
   * The `input` must include a special `$file` field which should be an instance of a `File` object.
   *
   * @returns A Promise that resolves to a `CreateResult` object.
   *          If the creation is successful, the `record` property will contain the created upload.
   *          If there are any field validation errors, they will be available in the `errors` property.
   *          The `message` property may contain an optional error message if there are issues during the database query.
   *
   * @example
   * ```typescript
   * const result = await query('uploads').create({
   *   directory: 'notes/',
   *   $file: new File(['foo'], 'foo.txt', { type: 'text/plain' }),
   * })
   *
   * if (result.success) {
   *   console.log('Upload was successful:', result.record)
   * } else {
   *   console.error('Upload failed:', result.errors)
   * }
   * ```
   */
  // @ts-ignore
  async create(
    input: CreateInput['uploads'],
  ): Promise<CreateResult<ReturnedFieldType, ReturnableFieldName & keyof ReturnedFieldType>> {
    const selection = this.prepareSelection()
    const result = await super.create(input)
    this.revertSelection(selection)

    if (result.success) {
      const options = getModuleOption('uploads')
      const uploadsDir = path.resolve(getModuleOption('uploadsDir'))

      try {
        if (options.drive.type === 'local') {
          fs.ensureDirSync(path.resolve(joinRouteParts(uploadsDir, result.record.directory)))
          fs.writeFileSync(
            path.resolve(joinRouteParts(uploadsDir, result.record.directory, result.record.filename)),
            new DataView(await input.$file.arrayBuffer()),
          )
        } else {
          await s3PutObject(
            joinRouteParts(result.record.directory, result.record.filename),
            Buffer.from(await input.$file.arrayBuffer()),
            input.$file.type,
          )
        }

        await this.createThumbnail(result.record)
      } catch (e: any) {
        return { success: false, errors: {}, message: e.message } as any
      }

      for (const [field, selected] of Object.entries(selection)) {
        if (!selected) {
          delete (result.record as any)[field]
        }
      }
    }

    return result as any
  }

  /**
   * Create multiple records in the 'uploads' collection using the data provided in the `input` array.
   * Each element of `input` represents a record to be created and must include a `$file` field which
   * must be an instance of a `File` object.
   *
   * @returns A Promise that resolves to a `CreateManyResult` object.
   *          If successful, the created uploads will be available in the `records` property.
   *          If any input has validation errors, the `errors` property will contain an array of error objects at the corresponding index.
   *          If there are no errors for a particular input, the value at that index will be `null`.
   *          The `message` property may contain an optional error message for any database query issues.
   *
   * Note: If any input fails validation, no records will be created.
   *
   * @example
   * ```typescript
   * const result = await query('uploads').createMany([
   *   { $file: new File(['foo'], 'foo-1.txt', { type: 'text/plain' }) },
   *   { $file: new File(['foo'], 'foo-2.txt', { type: 'text/plain' }) },
   *   { $file: ['foo'] },
   * ])
   *
   * if (result.success) {
   *   console.log('Uploads created:', result.records)
   * } else {
   *   console.log('Errors:', result.errors) // [null, null, { $file: 'Invalid input type' }]
   * }
   * ```
   */
  // @ts-ignore
  async createMany(
    input: CreateInput['uploads'][],
  ): Promise<CreateManyResult<ReturnedFieldType, ReturnableFieldName & keyof ReturnedFieldType>> {
    const selection = this.prepareSelection()
    const result = await super.createMany(input)
    this.revertSelection(selection)

    if (result.success) {
      const options = getModuleOption('uploads')
      const uploadsDir = path.resolve(getModuleOption('uploadsDir'))

      for (const [i, record] of result.records.entries()) {
        try {
          if (options.drive.type === 'local') {
            fs.ensureDirSync(path.resolve(joinRouteParts(uploadsDir, record.directory)))
            fs.writeFileSync(
              path.resolve(joinRouteParts(uploadsDir, record.directory, record.filename)),
              new DataView(await input[i].$file.arrayBuffer()),
            )
          } else {
            await s3PutObject(
              joinRouteParts(record.directory, record.filename),
              Buffer.from(await input[i].$file.arrayBuffer()),
              input[i].$file.type,
            )
          }

          await this.createThumbnail(record)
        } catch (e: any) {
          return { success: false, errors: {}, message: e.message } as any
        }

        for (const [field, selected] of Object.entries(selection)) {
          if (!selected) {
            delete (record as any)[field]
          }
        }
      }
    }

    return result as any
  }

  /**
   * Update the existing records in the 'uploads' collection based on the defined conditions.
   *
   * @returns A Promise that resolves to an `UpdateResult` object.
   *          If successful, the updated uploads will be available in the `records` property.
   *          If there are any field validation errors, they will be available in the `errors` property.
   *          The `message` property may contain an optional error message if there are issues during the database query.
   *
   * @example
   * ```typescript
   * // Move all uploads in the 'notes/' directory to the 'archived-notes/' directory
   * const result = await query('uploads').whereLike('directory', 'notes/%').update({
   *   directory: 'archived-notes/',
   * })
   *
   * if (result.success) {
   *   console.log('Records updated:', result.records)
   * } else {
   *   console.error('Update failed:', result.errors)
   * }
   * ```
   */
  // @ts-ignore
  async update(
    input: UpdateInput['uploads'],
  ): Promise<UpdateResult<ReturnedFieldType, ReturnableFieldName & keyof ReturnedFieldType>> {
    const options = getModuleOption('uploads')
    const uploadsDir = path.resolve(getModuleOption('uploadsDir'))
    const original: any[] = await (await db())
      .model(this.table)
      .findAll({ ...(await this.applySequelizeOptions(['where'])), raw: true })
    const selection = this.prepareSelection()
    const result = await super.update(input)
    this.revertSelection(selection)

    if (result.success) {
      const recordIds = result.records.map((record) => record.id)
      const images: any[] = await (await db())
        .model('_optimized_images')
        .findAll({ where: { upload_id: { [Op.in]: recordIds } }, raw: true })

      for (const record of result.records) {
        const originalRecord = original.find((r) => +r.id === record.id)

        if (originalRecord) {
          try {
            const from = joinRouteParts(originalRecord.directory, originalRecord.filename)
            const to = joinRouteParts(record.directory, record.filename)

            if (from !== to) {
              if (options.drive.type === 'local') {
                fs.ensureDirSync(path.resolve(joinRouteParts(uploadsDir, record.directory)))
                fs.moveSync(
                  path.resolve(joinRouteParts(uploadsDir, from)),
                  path.resolve(joinRouteParts(uploadsDir, to)),
                  { overwrite: true },
                )
              } else {
                await s3MoveObject(from, to)
              }

              for (const image of images.filter((image) => +image.upload_id === record.id)) {
                const from = generateImagePaths(
                  originalRecord.directory,
                  originalRecord.filename,
                  image.hash,
                  image.format,
                ).drive
                const to = generateImagePaths(record.directory, record.filename, image.hash, image.format).drive
                const promises: Promise<any>[] = []

                if (options.drive.type === 'local') {
                  fs.moveSync(path.resolve(from), path.resolve(to), { overwrite: true })
                } else {
                  promises.push(s3MoveObject(from, to))
                }

                await Promise.all(promises)
              }
            }
          } catch (e: any) {
            return { success: false, errors: {}, message: e.message } as any
          }
        }

        for (const [field, selected] of Object.entries(selection)) {
          if (!selected) {
            delete (record as any)[field]
          }
        }
      }
    }

    return result as any
  }

  /**
   * Delete records from the 'uploads' collection based on the specified conditions.
   *
   * @returns A Promise that resolves to an array containing the deleted uploads.
   *
   * @example
   * ```typescript
   * // Delete all uploads in the 'archived-notes/' directory
   * await query('uploads').select({ id: true }).whereLike('directory', 'archived-notes/%').delete()
   * // Output: [{ id: 30 }, { id: 144 }, { id: 145 }]
   * ```
   */
  // @ts-ignore
  async delete(): Promise<Pick<ReturnedFieldType, ReturnableFieldName & keyof ReturnedFieldType>[]> {
    const options = getModuleOption('uploads')
    const uploadsDir = path.resolve(getModuleOption('uploadsDir'))
    const selection = this.prepareSelection()
    const records = await super.delete()
    const recordIds = records.map((record) => record.id)
    const images: any[] = await (await db())
      .model('_optimized_images')
      .findAll({ where: { upload_id: { [Op.in]: recordIds } }, raw: true })

    this.revertSelection(selection)

    for (const record of records) {
      try {
        if (options.drive.type === 'local') {
          fs.removeSync(path.resolve(joinRouteParts(uploadsDir, record.directory, record.filename)))

          for (const image of images.filter((image) => +image.upload_id === record.id)) {
            fs.removeSync(
              path.resolve(generateImagePaths(record.directory, record.filename, image.hash, image.format).drive),
            )
          }
        } else {
          await s3DeleteObject(joinRouteParts(record.directory, record.filename))

          const promises: Promise<any>[] = []

          for (const image of images.filter((image) => +image.upload_id === record.id)) {
            promises.push(
              s3DeleteObject(generateImagePaths(record.directory, record.filename, image.hash, image.format).drive),
            )
          }

          await Promise.all(promises)
        }
      } catch {}

      for (const [field, selected] of Object.entries(selection)) {
        if (!selected) {
          delete (record as any)[field]
        }
      }
    }

    await (await db()).model('_optimized_images').destroy({ where: { upload_id: { [Op.in]: recordIds } } })

    return records as any
  }

  async validate(
    input: Record<string, any>,
    operation: 'create' | 'read' | 'update',
    allInputs?: Record<string, any>[],
    skipFields?: string[],
  ): Promise<ValidationError<ReturnableFieldName>> {
    const errors: Record<string, any> = await super.validate(input, operation, allInputs, skipFields)

    if (operation === 'create') {
      if (!input.$file) {
        errors.$file = __(this.contextLanguageOption, 'pruvious-server', 'This field is required')
      } else {
        if (!(input.$file instanceof File)) {
          errors.$file = __(this.contextLanguageOption, 'pruvious-server', 'Invalid input type')
        } else if (!input.$file.name || !input.$file.type) {
          errors.$file = __(this.contextLanguageOption, 'pruvious-server', 'This field is required')
        } else if (input.$file.size > (getModuleOption('uploads').maxFileSize as number)) {
          errors.$file = __(this.contextLanguageOption, 'pruvious-server', 'The maximum allowable file size is $size', {
            size: format(getModuleOption('uploads').maxFileSize as number, { unitSeparator: ' ' }) ?? 'unknown',
          })
        }
      }
    }

    return errors
  }

  protected serializeInput(input: Record<string, any>) {
    const serialized = super.serializeInput(input)
    serialized.language = ''
    return serialized
  }

  protected prepareInput<T extends Record<string, any>>(input: T, operation: 'create' | 'update'): T {
    return objectOmit(
      objectPick(input, [...Object.keys(collections['uploads'].fields), '$file']),
      operation === 'update' ? this.getImmutableFields() : [],
    ) as T
  }

  protected getOperableFields(input: Record<string, any>, operation: 'create' | 'read' | 'update') {
    const fields = super.getOperableFields(input, operation)

    if (operation === 'create') {
      fields.push('$file' as any)
    }

    return fields
  }

  protected async sanitize(input: Record<string, any>, operation: 'create' | 'update') {
    const sanitized = await super.sanitize(input, operation)

    if (operation === 'create') {
      sanitized.$file = input.$file
    }

    return sanitized
  }

  private prepareSelection(): { id: boolean; directory: boolean; filename: boolean; type: boolean } {
    const selection = {
      id: this.selectedFields.includes('id'),
      directory: this.selectedFields.includes('directory'),
      filename: this.selectedFields.includes('filename'),
      type: this.selectedFields.includes('type'),
    }

    for (const [field, selected] of Object.entries(selection)) {
      if (!selected) {
        this.selectedFields.push(field)
      }
    }

    return selection
  }

  private revertSelection(selection: { id: boolean; directory: boolean; filename: boolean }) {
    for (const [field, selected] of Object.entries(selection)) {
      if (!selected) {
        this.deselect({ [field]: true } as any)
      }
    }
  }

  protected async createThumbnail(upload: Pick<CastedFieldType['uploads'], 'id' | 'directory' | 'filename' | 'type'>) {
    if (imageTypes.includes(upload.type) && upload.type !== 'image/svg+xml') {
      await getOptimizedImage(upload, { width: 320, height: 320, format: 'webp' })
    }
  }
}
