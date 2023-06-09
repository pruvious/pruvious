import {
  BlockRecord,
  Field,
  FieldGroup,
  flattenFields,
  imageExtensions,
} from '@pruvious-test/shared'
import { blocks } from 'App/imports'
import Page from 'App/Models/Page'
import Post from 'App/Models/Post'
import Preset from 'App/Models/Preset'
import Role from 'App/Models/Role'
import Upload from 'App/Models/Upload'
import User from 'App/Models/User'

export interface RelationMap {
  pages: Record<number, Page>
  presets: Record<number, Preset>
  uploads: Record<number, Upload>
  posts: Record<number, Post>
  roles: Record<number, Role>
  users: Record<number, User>
  errors: { pointer: string; rule: string; message?: string | undefined }[]
}

export interface RelationalFieldValidationError {
  field: string
  message: string
}

/**
 * Validate relational fields in blocks.
 */
export function validateRelationalBlockFields(
  sanitizedBlockRecords: BlockRecord[],
  relationMap: RelationMap,
): RelationalFieldValidationError[] {
  const errors: RelationalFieldValidationError[] = []

  sanitizedBlockRecords.forEach((blockRecord) => {
    const block = blocks.find((block) => block.name === blockRecord.name)!
    const fieldErrors = validateRelationalFields(
      blockRecord.props!,
      block.fields,
      relationMap,
      `${blockRecord.id}-`,
    )

    errors.push(...fieldErrors)

    Object.keys(blockRecord.children ?? {}).forEach((slot) => {
      const childErrors = validateRelationalBlockFields(blockRecord.children![slot], relationMap)
      errors.push(...childErrors)
    })
  })

  return errors
}

/**
 * Validate relational fields.
 */
export function validateRelationalFields(
  sanitizedFieldRecords: Record<string, any>,
  fields: (Field | FieldGroup)[],
  relationMap: RelationMap,
  idPrefix: string = '',
): RelationalFieldValidationError[] {
  const errors: RelationalFieldValidationError[] = []

  const flattenedFields = flattenFields(fields)

  flattenedFields.forEach((field) => {
    //
    // Image field validation
    //
    if (field.type === 'image') {
      const upload = relationMap.uploads[sanitizedFieldRecords[field.name]]

      if (upload) {
        if (
          upload.kind !== 'image' ||
          (!field.allow?.length && !imageExtensions.some((ext) => upload.name.endsWith(`.${ext}`)))
        ) {
          errors.push({
            field: idPrefix + field.name,
            message: 'The selected file is not an image',
          })
        } else if (field.allow && !field.allow.some((ext) => upload.name.endsWith(`.${ext}`))) {
          errors.push({
            field: idPrefix + field.name,
            message:
              field.allow.length === 1
                ? `Only ${field.allow[0]} images are allowed`
                : 'Only the following image types are allowed: ' + field.allow.join(', '),
          })
        } else if (field.minWidth && (upload.info.width ?? 0) < field.minWidth) {
          errors.push({
            field: idPrefix + field.name,
            message: `The image must be at least ${field.minWidth}px wide`,
          })
        } else if (field.minHeight && (upload.info.height ?? 0) < field.minHeight) {
          errors.push({
            field: idPrefix + field.name,
            message: `The image must be at least ${field.minHeight}px high`,
          })
        }
      }
    }
  })

  return errors
}
