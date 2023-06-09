import Env from '@ioc:Adonis/Core/Env'
import {
  BlockRecord,
  dayjsUTC,
  ExtractedFields,
  extractSpecialBlocks,
  extractSpecialFields,
  Field,
  FieldGroup,
  Image,
  PageRecord,
  PostRecord,
  PresetRecord,
  standardCollectionColumns,
  standardPageColumns,
  standardPageFields,
  standardRoleColumns,
  standardUploadColumns,
  standardUserColumns,
  UploadRecord,
  UserRecord,
} from '@pruvious/shared'
import { uniqueArray } from '@pruvious/utils'
import { getBaseUploadsUrl, getSiteBaseUrl } from 'App/helpers'
import { blocks, collectionsConfig, icons, pageConfig, uploadConfig, userConfig } from 'App/imports'
import Upload from 'App/Models/Upload'
import { getPage } from 'App/PageQuery'
import { getAnyPost } from 'App/PostQuery'
import { getPreset } from 'App/PresetQuery'
import { getRole } from 'App/RoleQuery'
import { getUpload } from 'App/UploadQuery'
import { getUser } from 'App/UserQuery'

export interface SkipPopulate {
  pageIds?: number[]
  presetIds?: number[]
  postIds?: number[]
  roleIds?: number[]
  uploadIds?: number[]
  userIds?: number[]
}

export async function populateBlocks(blockRecords: BlockRecord[], skipPopulate?: SkipPopulate) {
  const relations = extractSpecialBlocks(blockRecords, blocks)
  await fillRecords(relations, skipPopulate)
}

export async function populateFields(
  fieldRecords: Record<string, any>,
  fields: (Field | FieldGroup)[],
  skipPopulate?: SkipPopulate,
) {
  const relations = extractSpecialFields(fieldRecords, fields)
  await fillRecords(relations, skipPopulate)
}

async function fillRecords(relations: ExtractedFields, skipPopulate?: SkipPopulate) {
  const baseUploadsUrl = getBaseUploadsUrl(true)

  // Pages
  for (const [pageId, locations] of Object.entries(relations.pageIds)) {
    const page = await getPage(+pageId, {
      populate:
        !skipPopulate?.pageIds?.includes(+pageId) &&
        locations.some(({ field }) => {
          return (
            field.type === 'page' &&
            field.returnFields?.some((returnField) => {
              return (
                returnField === 'blocks' ||
                returnField === 'sharingImage' ||
                !standardPageColumns[returnField]
              )
            })
          )
        }),
      _skipPopulate: skipPopulate,
    } as any)

    for (const { blockRecord, fieldRecords, field } of locations) {
      let value: any =
        field.type === 'editor'
          ? blockRecord?.props
            ? blockRecord!.props![field.name]
            : fieldRecords
            ? fieldRecords[field.name]
            : ''
          : null

      if (page?.path !== undefined) {
        const urlPath =
          page.path + (Env.get('TRAILING_SLASH') && !page.path.endsWith('/') ? '/' : '')
        //
        // Editor fields
        //
        if (field.type === 'editor' && value) {
          value = value.replace(
            new RegExp(`(?:_append="([^>]*?)" )?href="\\$${page.id}"`, 'gi'),
            `href="${urlPath}$1"`,
          )
        }
        //
        // Link fields
        //
        else if (field.type === 'link') {
          value = blockRecord?.props
            ? blockRecord!.props![field.name]
            : fieldRecords
            ? fieldRecords[field.name]
            : null

          if (value) {
            value.url = getSiteBaseUrl(false) + urlPath + (value.append ?? '')
            value.path = urlPath + (value.append ?? '')
            delete value.append
          }
        }
        //
        // URL fields
        //
        else if (field.type === 'url') {
          value = blockRecord?.props
            ? blockRecord!.props![field.name]
            : fieldRecords
            ? fieldRecords[field.name]
            : ''

          if (value) {
            value = getSiteBaseUrl(false) + urlPath
          }
        }
        //
        // Page fields
        //
        else if (field.type === 'page') {
          value = blockRecord?.props
            ? blockRecord!.props![field.name]
            : fieldRecords
            ? fieldRecords[field.name]
            : ''

          if (value) {
            value = {}

            for (const returnField of field.returnFields ?? ['id', 'title', 'path']) {
              value[returnField] = page[returnField]
            }
          }
        }
      }

      if (blockRecord?.props) {
        blockRecord!.props![field.name] = value
      }

      if (fieldRecords) {
        fieldRecords[field.name] = value
      }
    }
  }

  // Presets
  for (const [presetId, locations] of Object.entries(relations.presetIds)) {
    const preset = await getPreset(+presetId, {
      populate:
        !skipPopulate?.presetIds?.includes(+presetId) &&
        locations.some(({ field }) => {
          return (
            field.type === 'preset' &&
            field.returnFields?.some((returnField) => {
              return returnField === 'blocks'
            })
          )
        }),
      _skipPopulate: skipPopulate,
    } as any)

    for (const { blockRecord, fieldRecords, field } of locations) {
      let value: any = null

      if (preset) {
        //
        // Preset fields
        //
        if (field.type === 'preset') {
          value = blockRecord?.props
            ? blockRecord!.props![field.name]
            : fieldRecords
            ? fieldRecords[field.name]
            : ''

          if (value) {
            value = {}

            for (const returnField of field.returnFields ?? ['id', 'blocks']) {
              value[returnField] = preset[returnField]
            }
          }
        }
      }

      if (blockRecord?.props) {
        blockRecord!.props![field.name] = value
      }

      if (fieldRecords) {
        fieldRecords[field.name] = value
      }
    }
  }

  // Uploads
  for (const [uploadId, locations] of Object.entries(relations.uploadIds)) {
    const upload = await getUpload(+uploadId, {
      populate:
        !skipPopulate?.uploadIds?.includes(+uploadId) &&
        locations.some(({ field }) => {
          return (
            field.type === 'file' &&
            field.returnFields?.some((returnField) => {
              return !standardUploadColumns[returnField]
            })
          )
        }),
      _skipPopulate: skipPopulate,
    } as any)
    const _upload = await Upload.find(uploadId)
    await _upload?.$relation('images')

    for (const { blockRecord, fieldRecords, field } of locations) {
      let value: any = null

      if (upload?.path) {
        //
        // File fields
        //
        if (field.type === 'file') {
          value = blockRecord?.props
            ? blockRecord!.props![field.name]
            : fieldRecords
            ? fieldRecords[field.name]
            : ''

          if (value) {
            value = {}

            for (const returnField of field.returnFields ?? ['id', 'url']) {
              value[returnField] = upload[returnField]
            }
          }
        }
        //
        // Image fields
        //
        else if (field.type === 'image' && upload.kind === 'image') {
          const info = upload.info as any
          const pruviousImage: Image = {
            url: baseUploadsUrl + upload.path,
            alt: upload.description ?? '',
            width: info?.width ?? null,
            height: info?.height ?? null,
            type: `image/${(info?.format === 'svg' ? 'svg+xml' : info?.format) ?? 'unknown'}`,
            sources: [],
          }

          if (field.sources?.length && (info?.format !== 'svg' || field.transformSvgs)) {
            for (const optimization of field.sources) {
              const image =
                (await _upload!.getImage(optimization)) ||
                (await _upload!.createImage(optimization))

              if (image?.path) {
                pruviousImage.sources.push({
                  media: optimization.media || null,
                  url: baseUploadsUrl + image.path,
                  width: image.info.width ?? image.width ?? info?.width ?? null,
                  height: image.info.height ?? image.height ?? info?.height ?? null,
                  type: `image/${
                    (image.info.format === 'svg' ? 'svg+xml' : image.info.format) ??
                    image.format ??
                    (info?.format === 'svg' ? 'svg+xml' : info?.format) ??
                    'unknown'
                  }`,
                })
              }
            }
          }

          value = pruviousImage
        }
      }

      if (blockRecord?.props) {
        blockRecord!.props![field.name] = value
      }

      if (fieldRecords) {
        fieldRecords[field.name] = value
      }
    }
  }

  // Posts
  for (const [postId, locations] of Object.entries(relations.postIds)) {
    const post = await getAnyPost(+postId, {
      populate:
        !skipPopulate?.postIds?.includes(+postId) &&
        locations.some(({ field }) => {
          return (
            field.type === 'post' &&
            field.returnFields?.some((returnField) => {
              return !standardCollectionColumns[returnField]
            })
          )
        }),
      _skipPopulate: skipPopulate,
    } as any)

    for (const { blockRecord, fieldRecords, field } of locations) {
      let value: any = null

      if (post) {
        //
        // Post fields
        //
        if (field.type === 'post') {
          value = blockRecord?.props
            ? blockRecord!.props![field.name]
            : fieldRecords
            ? fieldRecords[field.name]
            : ''

          if (value) {
            value = {}

            for (const returnField of field.returnFields ?? ['id']) {
              value[returnField] = post[returnField]
            }
          }
        }
      }

      if (blockRecord?.props) {
        blockRecord!.props![field.name] = value
      }

      if (fieldRecords) {
        fieldRecords[field.name] = value
      }
    }
  }

  // Roles
  for (const [roleId, locations] of Object.entries(relations.roleIds)) {
    const role = await getRole(+roleId, {
      populate:
        !skipPopulate?.roleIds?.includes(+roleId) &&
        locations.some(({ field }) => {
          return (
            field.type === 'role' &&
            field.returnFields?.some((returnField) => {
              return !standardRoleColumns[returnField]
            })
          )
        }),
    })

    for (const { blockRecord, fieldRecords, field } of locations) {
      let value: any = null

      if (role) {
        //
        // Role fields
        //
        if (field.type === 'role') {
          value = blockRecord?.props
            ? blockRecord!.props![field.name]
            : fieldRecords
            ? fieldRecords[field.name]
            : ''

          if (value) {
            value = {}

            for (const returnField of field.returnFields ?? ['id', 'name', 'capabilities']) {
              value[returnField] = role[returnField]
            }
          }
        }
      }

      if (blockRecord?.props) {
        blockRecord!.props![field.name] = value
      }

      if (fieldRecords) {
        fieldRecords[field.name] = value
      }
    }
  }

  // Users
  for (const [userId, locations] of Object.entries(relations.userIds)) {
    const user = await getUser(+userId, {
      populate:
        !skipPopulate?.userIds?.includes(+userId) &&
        locations.some(({ field }) => {
          return (
            field.type === 'user' &&
            field.returnFields?.some((returnField) => {
              return returnField === 'role' || !standardUserColumns[returnField]
            })
          )
        }),
      _skipPopulate: skipPopulate,
    } as any)

    for (const { blockRecord, fieldRecords, field } of locations) {
      let value: any = null

      if (user) {
        //
        // User fields
        //
        if (field.type === 'user') {
          value = blockRecord?.props
            ? blockRecord!.props![field.name]
            : fieldRecords
            ? fieldRecords[field.name]
            : ''

          if (value) {
            value = {}

            for (const returnField of field.returnFields ?? ['id', 'email']) {
              value[returnField] = user[returnField]
            }
          }
        }
      }

      if (blockRecord?.props) {
        blockRecord!.props![field.name] = value
      }

      if (fieldRecords) {
        fieldRecords[field.name] = value
      }
    }
  }

  // Date fields
  for (const { blockRecord, fieldRecords, field } of relations.dateFields) {
    if (blockRecord?.props && blockRecord!.props![field.name] !== null) {
      blockRecord!.props![field.name] = dayjsUTC(blockRecord!.props![field.name]).format(
        field.returnFormat ?? 'YYYY-MM-DD',
      )
    } else if (fieldRecords && fieldRecords[field.name] !== null) {
      fieldRecords[field.name] = dayjsUTC(fieldRecords[field.name]).format(
        field.returnFormat ?? 'YYYY-MM-DD',
      )
    }
  }

  // Date-time fields
  for (const { blockRecord, fieldRecords, field } of relations.dateTimeFields) {
    if (blockRecord?.props && blockRecord!.props![field.name] !== null) {
      blockRecord!.props![field.name] = dayjsUTC(blockRecord!.props![field.name]).format(
        field.returnFormat ?? '',
      )
    } else if (fieldRecords && fieldRecords[field.name] !== null) {
      fieldRecords[field.name] = dayjsUTC(fieldRecords[field.name]).format(field.returnFormat ?? '')
    }
  }

  // Editor fields
  for (const { blockRecord, fieldRecords, field } of relations.editorFields) {
    if (blockRecord?.props && blockRecord!.props![field.name]) {
      blockRecord!.props![field.name] = blockRecord!.props![field.name].replace(/_fr.-/g, 'class')
    } else if (fieldRecords && fieldRecords[field.name]) {
      fieldRecords[field.name] = fieldRecords[field.name].replace(/_fr.-/g, 'class')
    }
  }

  // Icon fields
  for (const { blockRecord, fieldRecords, field } of relations.iconFields) {
    if (blockRecord?.props && blockRecord!.props![field.name]) {
      blockRecord!.props![field.name] =
        field.returnFormat === 'name'
          ? blockRecord!.props![field.name]
          : icons[blockRecord!.props![field.name]] ?? ''
    } else if (fieldRecords && fieldRecords[field.name]) {
      fieldRecords[field.name] =
        field.returnFormat === 'name'
          ? fieldRecords[field.name]
          : icons[fieldRecords[field.name]] ?? ''
    }
  }

  // Time fields
  for (const { blockRecord, fieldRecords, field } of relations.timeFields) {
    if (blockRecord?.props && blockRecord!.props![field.name] !== null) {
      blockRecord!.props![field.name] = dayjsUTC(blockRecord!.props![field.name]).format(
        field.returnFormat ?? 'HH:mm:ss',
      )
    } else if (fieldRecords && fieldRecords[field.name] !== null) {
      fieldRecords[field.name] = dayjsUTC(fieldRecords[field.name]).format(
        field.returnFormat ?? 'HH:mm:ss',
      )
    }
  }
}

export async function populatePage(
  page: PageRecord,
  skipPopulate?: SkipPopulate,
): Promise<PageRecord> {
  const skip = skipPopulate
    ? {
        ...skipPopulate,
        pageIds: skipPopulate.pageIds ? uniqueArray([...skipPopulate.pageIds, page.id]) : [page.id],
      }
    : { pageIds: [page.id] }

  await populateBlocks(page.blocks ?? [], skip)
  await populateFields(
    page,
    [
      ...standardPageFields.filter((field) => field.name === 'sharingImage'),
      ...(pageConfig.fields ?? []),
    ],
    skip,
  )
  return page
}

export async function populatePreset(
  preset: PresetRecord,
  skipPopulate?: SkipPopulate,
): Promise<PresetRecord> {
  const skip = skipPopulate
    ? {
        ...skipPopulate,
        presetIds: skipPopulate.presetIds
          ? uniqueArray([...skipPopulate.presetIds, preset.id])
          : [preset.id],
      }
    : { presetIds: [preset.id] }
  await populateBlocks(preset.blocks ?? [], skip)
  return preset
}

export async function populateUpload(
  upload: UploadRecord,
  skipPopulate?: SkipPopulate,
): Promise<UploadRecord> {
  const skip = skipPopulate
    ? {
        ...skipPopulate,
        uploadIds: skipPopulate.uploadIds
          ? uniqueArray([...skipPopulate.uploadIds, upload.id])
          : [upload.id],
      }
    : { uploadIds: [upload.id] }
  await populateFields(upload, uploadConfig.fields ?? [], skip)
  return upload
}

export async function populatePost(
  collection: string,
  post: PostRecord,
  skipPopulate?: SkipPopulate,
): Promise<PostRecord> {
  const skip = skipPopulate
    ? {
        ...skipPopulate,
        postIds: skipPopulate.postIds ? uniqueArray([...skipPopulate.postIds, post.id]) : [post.id],
      }
    : { postIds: [post.id] }
  await populateFields(post, collectionsConfig[collection]?.fields ?? [], skip)
  return post
}

export async function populateUser(
  user: UserRecord,
  skipPopulate?: SkipPopulate,
): Promise<UserRecord> {
  const skip = skipPopulate
    ? {
        ...skipPopulate,
        userIds: skipPopulate.userIds ? uniqueArray([...skipPopulate.userIds, user.id]) : [user.id],
      }
    : { userIds: [user.id] }
  await populateFields(user, userConfig.fields ?? [], skip)
  return user
}
