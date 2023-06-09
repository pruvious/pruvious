import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import { BaseModel } from '@ioc:Adonis/Lucid/Orm'
import {
  ExtractedFields,
  extractFieldKeywords,
  FieldGroup,
  flattenFields,
  getDefaultFieldValue,
  getFieldValueType,
  QueryableField,
  QueryableModel,
  walkBlockFields,
  walkFields,
} from '@pruvious/shared'
import { trimAll } from '@pruvious/utils'
import { BaseQuery } from 'App/BaseQuery'
import Page from 'App/Models/Page'
import Post from 'App/Models/Post'
import Preset from 'App/Models/Preset'
import Role from 'App/Models/Role'
import Upload from 'App/Models/Upload'
import User from 'App/Models/User'
import { blocks } from './imports'
import { populateBlocks, populateFields } from './populator'

export async function addExistingRelations(
  relations: ExtractedFields,
  existingIds: {
    existingPageIds: Set<number>
    existingPresetIds: Set<number>
    existingPostIds: Set<number>
    existingUploadIds: Set<number>
    existingRoleIds: Set<number>
    existingUserIds: Set<number>
  },
) {
  // Check related pages
  for (const [pageId, locations] of Object.entries(relations.pageIds)) {
    const relatedPage = await Page.find(pageId)

    if (relatedPage) {
      existingIds.existingPageIds.add(relatedPage.id)
    } else {
      for (const { blockRecord, fieldRecords, field } of locations) {
        if (blockRecord) {
          blockRecord!.props![field.name] = null
        }

        if (fieldRecords) {
          fieldRecords[field.name] = null
        }
      }
    }
  }

  // Check presets
  for (const [presetId, locations] of Object.entries(relations.presetIds)) {
    const preset = await Preset.find(presetId)

    if (preset) {
      existingIds.existingPresetIds.add(preset.id)
    } else {
      for (const { blockRecord, fieldRecords, field } of locations) {
        if (blockRecord) {
          blockRecord!.props![field.name] = null
        }

        if (fieldRecords) {
          fieldRecords[field.name] = null
        }
      }
    }
  }

  // Check posts
  for (const [postId, locations] of Object.entries(relations.postIds)) {
    const post = await Post.find(postId)

    if (post) {
      existingIds.existingPostIds.add(post.id)
    } else {
      for (const { blockRecord, fieldRecords, field } of locations) {
        if (blockRecord) {
          blockRecord!.props![field.name] = null
        }

        if (fieldRecords) {
          fieldRecords[field.name] = null
        }
      }
    }
  }

  // Check uploads
  for (const [uploadId, locations] of Object.entries(relations.uploadIds)) {
    const upload = await Upload.find(uploadId)

    if (upload) {
      existingIds.existingUploadIds.add(upload.id)
    }

    for (const { blockRecord, fieldRecords, field } of locations) {
      if (upload && upload.kind === 'image' && field.type === 'image') {
        if (field.sources && (upload.info.format !== 'svg' || field.transformSvgs)) {
          for (const optimization of field.sources) {
            const image = await upload.getImage(optimization)

            if (!image) {
              await upload.createImage(optimization)
            }
          }
        }
      } else {
        if (blockRecord) {
          blockRecord!.props![field.name] = null
        }

        if (fieldRecords) {
          fieldRecords[field.name] = null
        }
      }
    }
  }

  // Check roles
  for (const [roleId, locations] of Object.entries(relations.roleIds)) {
    const role = await Role.find(roleId)

    if (role) {
      existingIds.existingRoleIds.add(role.id)
    } else {
      for (const { blockRecord, fieldRecords, field } of locations) {
        if (blockRecord) {
          blockRecord!.props![field.name] = null
        }

        if (fieldRecords) {
          fieldRecords[field.name] = null
        }
      }
    }
  }

  // Check users
  for (const [userId, locations] of Object.entries(relations.userIds)) {
    const user = await User.find(userId)

    if (user) {
      existingIds.existingUserIds.add(user.id)
    } else {
      for (const { blockRecord, fieldRecords, field } of locations) {
        if (blockRecord) {
          blockRecord!.props![field.name] = null
        }

        if (fieldRecords) {
          fieldRecords[field.name] = null
        }
      }
    }
  }
}

export async function getChoices(
  modelConfig: QueryableModel & { fields?: (QueryableField | FieldGroup)[] },
  metaModel: typeof BaseModel,
  queryFunction: () => BaseQuery<any>,
  request: HttpContextContract['request'],
  response: HttpContextContract['response'],
) {
  const field = request.input('field')
  const keywords = request.input('keywords', '')
  const page = request.input('page')
  const metaField = flattenFields(modelConfig.fields ?? []).find((_field) => _field.name === field)

  if (metaField) {
    const query = metaModel
      .query()
      .select('value')
      .where('key', field)
      .andWhereNot('value', '')
      .andWhereNotNull('value')
      .groupBy('value')
      .orderBy('value', 'asc')

    if (keywords.trim()) {
      trimAll(keywords)
        .split(' ')
        .forEach((keyword) => {
          query.whereLike('value', `%${keyword}%`)
        })
    }

    const paginator = await query.paginate(
      Math.floor(Math.max(1, page)),
      Math.floor(Math.max(1, Math.min(50, modelConfig.perPageLimit ?? 50))),
    )
    const paginatorJson = paginator.toJSON()

    delete paginatorJson.meta.firstPageURL
    delete paginatorJson.meta.lastPageURL
    delete paginatorJson.meta.nextPageURL
    delete paginatorJson.meta.previousPageURL

    return {
      data: paginatorJson.data.map((row) => row.value),
      meta: paginatorJson.meta,
    }
  }

  return getStandardChoices(queryFunction, request, response)
}

export async function getStandardChoices(
  queryFunction: () => BaseQuery<any>,
  request: HttpContextContract['request'],
  response: HttpContextContract['response'],
) {
  const field = request.input('field')
  const keywords = request.input('keywords', '')
  const page = request.input('page')

  const query = queryFunction()
    .select(field)
    .whereNot(field, '')
    .andWhereNotNull(field)
    .orderBy(field, 'asc')
    .groupBy(field)

  if (keywords.trim()) {
    trimAll(keywords)
      .split(' ')
      .forEach((keyword) => {
        query.whereLike(field, `%${keyword}%`)
      })
  }

  if (query.diagnostics.length) {
    return response.badRequest({ error: query.diagnostics[0] })
  }

  const { data, meta } = await query.paginate(page)

  return {
    data: data.map((row) => row[field]),
    meta,
  }
}

export async function rebuildKeywords(
  table: string,
  model: any,
  searchConfig: string[],
  standardFields: QueryableField[],
  metaFields: (FieldGroup | QueryableField)[],
) {
  const metaRecords = model.getMetaFields ? await model.getMetaFields() : {}
  const fieldRecords = JSON.parse(JSON.stringify({ ...model.serialize(), ...metaRecords }))
  const keywordItems: { keywords: string; priority: number }[] = []

  const search = searchConfig.map((item) => {
    const parts = item.split(':')
    return { fieldName: parts[0], priority: parts[1] ? +parts[1] : 10 }
  })

  const fields = flattenFields([...standardFields, ...metaFields])
    .filter((field) => {
      const item = search.find((item) => item.fieldName === field.name)

      if (item) {
        ;(field as any).search = item.priority
        return true
      }

      return false
    })
    .sort((a, b) => {
      return (
        search.findIndex((item) => item.fieldName === a.name) -
        search.findIndex((item) => item.fieldName === b.name)
      )
    })

  await populateFields(fieldRecords, fields)

  for (const { field, value } of walkFields(fieldRecords, fields)) {
    if (field.name === 'blocks' && (table === 'pages' || table === 'presets')) {
      const blockRecords = JSON.parse(JSON.stringify(fieldRecords.blocks))

      await populateBlocks(blockRecords)

      for (const { field, value } of walkBlockFields(blockRecords, blocks)) {
        const keywords = extractFieldKeywords(field, value)

        if (keywords) {
          keywordItems.push(keywords)
        }
      }
    } else {
      const keywords = extractFieldKeywords(field, value)

      if (keywords) {
        keywordItems.push(keywords)
      }
    }
  }

  const _keywords = keywordItems
    .sort((a, b) => a.priority - b.priority)
    .map((item) => item.keywords)
    .join(' ')

  await Database.from(table).where('id', model.id).update({ _keywords }).exec()
}

export async function getMetaFields(
  model: any,
  config: QueryableModel & { fields?: (QueryableField | FieldGroup)[] },
  nullNotExisting: boolean = true,
): Promise<Record<string, any>> {
  const metaFields: Record<string, any> = {}

  if (config.fields) {
    await model.$relation('meta')

    for (const field of flattenFields(config.fields)) {
      const valueType = getFieldValueType(field)
      const meta = model.meta.find((meta: any) => meta.key === field.name)

      if (!meta && !nullNotExisting) {
        metaFields[field.name] = undefined
      } else {
        metaFields[field.name] =
          meta && meta.value !== null
            ? valueType === 'string' || valueType === 'json'
              ? meta.value
              : valueType === 'boolean'
              ? !!+meta.value
              : +meta.value
            : null
      }
    }
  }

  return metaFields
}

export async function initMetaFields(
  records: Record<string, any>,
  model: any,
  config: QueryableModel & { fields?: (QueryableField | FieldGroup)[] },
) {
  if (config.fields) {
    await model.related('meta').updateOrCreateMany(
      Object.entries(records).map(([key, value]) => ({
        key,
        value:
          value === undefined
            ? getDefaultFieldValue(
                flattenFields(config.fields!).find((field) => field.name === key)!,
              )
            : value,
      })),
      'key',
    )

    await model.load('meta')
  }
}

export async function filterExistingIds(ids: {
  pageIds: number[]
  presetIds: number[]
  postIds: number[]
  uploadIds: number[]
  roleIds: number[]
  userIds: number[]
}) {
  let i: number

  i = 0
  for (const pageId of [...ids.pageIds]) {
    if (await Page.find(pageId)) {
      i++
    } else {
      ids.pageIds.splice(i, 1)
    }
  }

  i = 0
  for (const presetId of [...ids.presetIds]) {
    if (await Preset.find(presetId)) {
      i++
    } else {
      ids.presetIds.splice(i, 1)
    }
  }

  i = 0
  for (const uploadId of [...ids.uploadIds]) {
    if (await Upload.find(uploadId)) {
      i++
    } else {
      ids.uploadIds.splice(i, 1)
    }
  }

  i = 0
  for (const postId of [...ids.postIds]) {
    if (await Post.find(postId)) {
      i++
    } else {
      ids.postIds.splice(i, 1)
    }
  }

  i = 0
  for (const roleId of [...ids.roleIds]) {
    if (await Role.find(roleId)) {
      i++
    } else {
      ids.roleIds.splice(i, 1)
    }
  }

  i = 0
  for (const userId of [...ids.userIds]) {
    if (await User.find(userId)) {
      i++
    } else {
      ids.userIds.splice(i, 1)
    }
  }
}
