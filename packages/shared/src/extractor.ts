import { isObject, stripHTML as stripHTML2, trimAll } from '@pruvious-test/utils'
import { stripHtml } from 'string-strip-html'
import {
  Block,
  BlockField,
  BlockRecord,
  DateField,
  DateTimeField,
  EditorField,
  Field,
  FieldGroup,
  FileField,
  IconField,
  ImageField,
  LinkField,
  PageField,
  PostField,
  PresetField,
  RoleField,
  TimeField,
  UrlField,
  UserField,
} from './types'

interface Location<T extends Field> {
  blockRecord?: BlockRecord
  fieldRecords?: Record<string, any>
  field: T
  fieldId: string
  fullId: string
}

export interface ExtractedFields {
  pageIds: Record<number, Location<EditorField | LinkField | PageField | UrlField>[]>
  presetIds: Record<number, Location<PresetField>[]>
  uploadIds: Record<number, Location<FileField | ImageField>[]>
  postIds: Record<number, Location<PostField>[]>
  roleIds: Record<number, Location<RoleField>[]>
  userIds: Record<number, Location<UserField>[]>
  dateFields: Location<DateField>[]
  dateTimeFields: Location<DateTimeField>[]
  editorFields: Location<EditorField>[]
  iconFields: Location<IconField>[]
  timeFields: Location<TimeField>[]
}

export function extractSpecialBlocks(
  blockRecords: BlockRecord[],
  blocks: Block[],
): ExtractedFields {
  const pageIds: ExtractedFields['pageIds'] = {}
  const presetIds: ExtractedFields['presetIds'] = {}
  const uploadIds: ExtractedFields['uploadIds'] = {}
  const postIds: ExtractedFields['postIds'] = {}
  const roleIds: ExtractedFields['roleIds'] = {}
  const userIds: ExtractedFields['userIds'] = {}
  const dateFields: ExtractedFields['dateFields'] = []
  const dateTimeFields: ExtractedFields['dateTimeFields'] = []
  const editorFields: ExtractedFields['editorFields'] = []
  const iconFields: ExtractedFields['iconFields'] = []
  const timeFields: ExtractedFields['timeFields'] = []

  blockRecords.forEach((blockRecord) => {
    const block = blocks.find((block) => block.name === blockRecord.name)

    if (block?.fields && blockRecord.props) {
      const fieldRelations = extractSpecialFields(blockRecord.props, block.fields, blockRecord)

      mergeMaps(pageIds, fieldRelations.pageIds)
      mergeMaps(presetIds, fieldRelations.presetIds)
      mergeMaps(uploadIds, fieldRelations.uploadIds)
      mergeMaps(postIds, fieldRelations.postIds)
      mergeMaps(roleIds, fieldRelations.roleIds)
      mergeMaps(userIds, fieldRelations.userIds)
      dateFields.push(...fieldRelations.dateFields)
      dateTimeFields.push(...fieldRelations.dateTimeFields)
      editorFields.push(...fieldRelations.editorFields)
      iconFields.push(...fieldRelations.iconFields)
      timeFields.push(...fieldRelations.timeFields)
    }

    if (blockRecord.children) {
      Object.entries(blockRecord.children).forEach(([_, childBlocks]) => {
        const childRelations = extractSpecialBlocks(childBlocks, blocks)

        mergeMaps(pageIds, childRelations.pageIds)
        mergeMaps(presetIds, childRelations.presetIds)
        mergeMaps(uploadIds, childRelations.uploadIds)
        mergeMaps(postIds, childRelations.postIds)
        mergeMaps(roleIds, childRelations.roleIds)
        mergeMaps(userIds, childRelations.userIds)
        dateFields.push(...childRelations.dateFields)
        dateTimeFields.push(...childRelations.dateTimeFields)
        editorFields.push(...childRelations.editorFields)
        iconFields.push(...childRelations.iconFields)
        timeFields.push(...childRelations.timeFields)
      })
    }
  })

  return {
    pageIds,
    presetIds,
    uploadIds,
    postIds,
    roleIds,
    userIds,
    dateFields,
    dateTimeFields,
    editorFields,
    iconFields,
    timeFields,
  }
}

export function extractSpecialFields(
  fieldRecords: Record<string, any>,
  fields: (Field | FieldGroup)[],
  blockRecord?: BlockRecord,
  idPrefix: string = '',
): ExtractedFields {
  const pageIds: ExtractedFields['pageIds'] = {}
  const presetIds: ExtractedFields['presetIds'] = {}
  const uploadIds: ExtractedFields['uploadIds'] = {}
  const postIds: ExtractedFields['postIds'] = {}
  const roleIds: ExtractedFields['roleIds'] = {}
  const userIds: ExtractedFields['userIds'] = {}
  const dateFields: ExtractedFields['dateFields'] = []
  const dateTimeFields: ExtractedFields['dateTimeFields'] = []
  const editorFields: ExtractedFields['editorFields'] = []
  const iconFields: ExtractedFields['iconFields'] = []
  const timeFields: ExtractedFields['timeFields'] = []

  fields.forEach((field) => {
    switch (field.type) {
      case 'stack':
        const stackRelations = extractSpecialFields(
          fieldRecords,
          field.fields,
          blockRecord,
          idPrefix,
        )
        mergeMaps(pageIds, stackRelations.pageIds)
        mergeMaps(presetIds, stackRelations.presetIds)
        mergeMaps(uploadIds, stackRelations.uploadIds)
        mergeMaps(postIds, stackRelations.postIds)
        mergeMaps(roleIds, stackRelations.roleIds)
        mergeMaps(userIds, stackRelations.userIds)
        dateFields.push(...stackRelations.dateFields)
        dateTimeFields.push(...stackRelations.dateTimeFields)
        editorFields.push(...stackRelations.editorFields)
        iconFields.push(...stackRelations.iconFields)
        timeFields.push(...stackRelations.timeFields)
        break
      case 'tabs':
        field.tabs.forEach((tab) => {
          const tabRelations = extractSpecialFields(fieldRecords, tab.fields, blockRecord, idPrefix)
          mergeMaps(pageIds, tabRelations.pageIds)
          mergeMaps(presetIds, tabRelations.presetIds)
          mergeMaps(uploadIds, tabRelations.uploadIds)
          mergeMaps(postIds, tabRelations.postIds)
          mergeMaps(roleIds, tabRelations.roleIds)
          mergeMaps(userIds, tabRelations.userIds)
          dateFields.push(...tabRelations.dateFields)
          dateTimeFields.push(...tabRelations.dateTimeFields)
          editorFields.push(...tabRelations.editorFields)
          iconFields.push(...tabRelations.iconFields)
          timeFields.push(...tabRelations.timeFields)
        })
        break
      case 'image':
        if (fieldRecords[field.name]) {
          addToMap(uploadIds, +fieldRecords![field.name], {
            blockRecord,
            fieldRecords,
            field,
            fieldId: idPrefix + field.name,
            fullId: blockRecord
              ? `${blockRecord.id}-${idPrefix}${field.name}`
              : idPrefix + field.name,
          })
        }
        break
      case 'repeater':
        fieldRecords[field.name]?.forEach((subFieldRecords: Record<string, any>, index: number) => {
          const repeaterRelations = extractSpecialFields(
            subFieldRecords,
            field.subFields,
            undefined,
            blockRecord
              ? `${blockRecord.id}-${idPrefix}${field.name}.${index}.`
              : `${idPrefix}${field.name}.${index}.`,
          )
          mergeMaps(pageIds, repeaterRelations.pageIds)
          mergeMaps(presetIds, repeaterRelations.presetIds)
          mergeMaps(uploadIds, repeaterRelations.uploadIds)
          mergeMaps(postIds, repeaterRelations.postIds)
          mergeMaps(roleIds, repeaterRelations.roleIds)
          mergeMaps(userIds, repeaterRelations.userIds)
          dateFields.push(...repeaterRelations.dateFields)
          dateTimeFields.push(...repeaterRelations.dateTimeFields)
          editorFields.push(...repeaterRelations.editorFields)
          iconFields.push(...repeaterRelations.iconFields)
          timeFields.push(...repeaterRelations.timeFields)
        })

        break
      case 'date':
        dateFields.push({
          blockRecord,
          fieldRecords,
          field,
          fieldId: idPrefix + field.name,
          fullId: blockRecord
            ? `${blockRecord.id}-${idPrefix}${field.name}`
            : idPrefix + field.name,
        })
        break
      case 'dateTime':
        dateTimeFields.push({
          blockRecord,
          fieldRecords,
          field,
          fieldId: idPrefix + field.name,
          fullId: blockRecord
            ? `${blockRecord.id}-${idPrefix}${field.name}`
            : idPrefix + field.name,
        })
        break
      case 'editor':
        if (fieldRecords[field.name]) {
          const regex = /href="\$([1-9][0-9]*)"/gi
          let match: RegExpExecArray | null = null

          do {
            match = regex.exec(fieldRecords[field.name])

            if (match) {
              addToMap(pageIds, +match[1], {
                blockRecord,
                fieldRecords,
                field,
                fieldId: idPrefix + field.name,
                fullId: blockRecord
                  ? `${blockRecord.id}-${idPrefix}${field.name}`
                  : idPrefix + field.name,
              })
            }
          } while (match)

          editorFields.push({
            blockRecord,
            fieldRecords,
            field,
            fieldId: idPrefix + field.name,
            fullId: blockRecord
              ? `${blockRecord.id}-${idPrefix}${field.name}`
              : idPrefix + field.name,
          })
        }
        break
      case 'icon':
        iconFields.push({
          blockRecord,
          fieldRecords,
          field,
          fieldId: idPrefix + field.name,
          fullId: blockRecord
            ? `${blockRecord.id}-${idPrefix}${field.name}`
            : idPrefix + field.name,
        })
        break
      case 'time':
        timeFields.push({
          blockRecord,
          fieldRecords,
          field,
          fieldId: idPrefix + field.name,
          fullId: blockRecord
            ? `${blockRecord.id}-${idPrefix}${field.name}`
            : idPrefix + field.name,
        })
        break
      case 'link':
        if (fieldRecords[field.name] && fieldRecords[field.name].url.match(/^\$[1-9][0-9]*$/)) {
          addToMap(pageIds, +fieldRecords![field.name].url.slice(1), {
            blockRecord,
            fieldRecords,
            field,
            fieldId: idPrefix + field.name,
            fullId: blockRecord
              ? `${blockRecord.id}-${idPrefix}${field.name}`
              : idPrefix + field.name,
          })
        }
        break
      case 'url':
        if (
          field.linkable &&
          fieldRecords[field.name] &&
          fieldRecords[field.name].match(/^\$[1-9][0-9]*$/)
        ) {
          addToMap(pageIds, +fieldRecords![field.name].slice(1), {
            blockRecord,
            fieldRecords,
            field,
            fieldId: idPrefix + field.name,
            fullId: blockRecord
              ? `${blockRecord.id}-${idPrefix}${field.name}`
              : idPrefix + field.name,
          })
        }
        break
      case 'page':
        if (fieldRecords[field.name]) {
          addToMap(pageIds, +fieldRecords![field.name], {
            blockRecord,
            fieldRecords,
            field,
            fieldId: idPrefix + field.name,
            fullId: blockRecord
              ? `${blockRecord.id}-${idPrefix}${field.name}`
              : idPrefix + field.name,
          })
        }
        break
      case 'preset':
        if (fieldRecords[field.name]) {
          addToMap(presetIds, +fieldRecords![field.name], {
            blockRecord,
            fieldRecords,
            field,
            fieldId: idPrefix + field.name,
            fullId: blockRecord
              ? `${blockRecord.id}-${idPrefix}${field.name}`
              : idPrefix + field.name,
          })
        }
        break
      case 'file':
        if (fieldRecords[field.name]) {
          addToMap(uploadIds, +fieldRecords![field.name], {
            blockRecord,
            fieldRecords,
            field,
            fieldId: idPrefix + field.name,
            fullId: blockRecord
              ? `${blockRecord.id}-${idPrefix}${field.name}`
              : idPrefix + field.name,
          })
        }
        break
      case 'post':
        if (fieldRecords[field.name]) {
          addToMap(postIds, +fieldRecords![field.name], {
            blockRecord,
            fieldRecords,
            field,
            fieldId: idPrefix + field.name,
            fullId: blockRecord
              ? `${blockRecord.id}-${idPrefix}${field.name}`
              : idPrefix + field.name,
          })
        }
        break
      case 'role':
        if (fieldRecords[field.name]) {
          addToMap(roleIds, +fieldRecords![field.name], {
            blockRecord,
            fieldRecords,
            field,
            fieldId: idPrefix + field.name,
            fullId: blockRecord
              ? `${blockRecord.id}-${idPrefix}${field.name}`
              : idPrefix + field.name,
          })
        }
        break
      case 'user':
        if (fieldRecords[field.name]) {
          addToMap(userIds, +fieldRecords![field.name], {
            blockRecord,
            fieldRecords,
            field,
            fieldId: idPrefix + field.name,
            fullId: blockRecord
              ? `${blockRecord.id}-${idPrefix}${field.name}`
              : idPrefix + field.name,
          })
        }
        break
    }
  })

  return {
    pageIds,
    presetIds,
    uploadIds,
    postIds,
    roleIds,
    userIds,
    dateFields,
    dateTimeFields,
    editorFields,
    iconFields,
    timeFields,
  }
}

export function extractFieldKeywords(
  field: BlockField,
  value: any,
): { keywords: string; priority: number } | null {
  if (
    field.type !== 'checkbox' &&
    field.type !== 'date' &&
    field.type !== 'dateTime' &&
    field.type !== 'repeater' &&
    field.type !== 'size' &&
    field.type !== 'switch' &&
    field.type !== 'time' &&
    field.search === false
  ) {
    return null
  }

  const keywords: string[] = []

  if (field.type === 'editor') {
    if (typeof value === 'string') {
      try {
        keywords.push(stripHtml(value).result)
      } catch (_) {
        keywords.push(stripHTML2(value))
      }
    }
  } else if (field.type === 'image') {
    if (isObject(value)) {
      if (value.alt.trim()) {
        keywords.push(value.alt.trim())
      }

      keywords.push(value.url, value.type)
    }
  } else if (field.type === 'link') {
    if (isObject(value)) {
      if (value.label) {
        keywords.push(value.label)
      }

      keywords.push(value.url + (value.append ?? ''))
    }
  } else if (field.type === 'icon' || field.type === 'number' || field.type === 'slider') {
    if (typeof value === 'string') {
      keywords.push(value)
    }
  } else if (
    field.type === 'page' ||
    field.type === 'preset' ||
    field.type === 'file' ||
    field.type === 'post' ||
    field.type === 'role' ||
    field.type === 'user'
  ) {
    if (isObject(value)) {
      Object.values(value).forEach((propValue) => {
        if (typeof propValue === 'string' || typeof propValue === 'number') {
          keywords.push(`${propValue}`)
        } else if (typeof propValue === 'object') {
          keywords.push(JSON.stringify(propValue))
        }
      })
    }
  } else if (field.type === 'text' || field.type === 'textArea') {
    const trimmed = typeof value === 'string' ? trimAll(value) : null

    if (trimmed) {
      keywords.push(trimmed)
    }
  } else if (field.type === 'url') {
    if (value && typeof value === 'string' && !value.match(/^\$[1-9][0-9]*$/)) {
      keywords.push(value)
    }
  } else if (field.type === 'buttons' || field.type === 'select') {
    const choice = field.choices?.find((choice) => choice.value === value)
    keywords.push(choice ? `${choice.label} ${value}` : value)
  } else if (field.type === 'checkboxes') {
    if (Array.isArray(value)) {
      for (const checkboxValue of value) {
        const choice = field.choices?.find((choice) => choice.value === checkboxValue)
        keywords.push(choice ? `${choice.label} ${checkboxValue}` : checkboxValue)
      }
    }
  } else if (field.type === 'switch') {
    keywords.push(value ? field.trueLabel ?? 'Yes' : field.falseLabel ?? 'No')
  }

  return keywords.length
    ? { keywords: keywords.join(' ').toLowerCase(), priority: (field as any).search ?? 10 }
    : null
}

function addToMap<T extends Field>(
  map: Record<number, Location<T>[]>,
  modelId: number,
  ...location: Location<T>[]
) {
  if (!map[modelId]) {
    map[modelId] = []
  }

  map[modelId].push(...location)
}

function mergeMaps<T extends Field>(
  source: Record<number, Location<T>[]>,
  ...targets: Record<number, Location<T>[]>[]
) {
  targets.forEach((target) => {
    Object.entries(target).forEach(([id, locations]) => {
      addToMap(source, +id, ...locations)
    })
  })
}
