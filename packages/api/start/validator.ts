import { validator } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import {
  ConditionalLogic,
  ExtractedFields,
  extractSpecialBlocks,
  extractSpecialFields,
  Field,
  FieldGroup,
  flattenFields,
  getFieldValueType,
  getPageLayouts,
  getPageLayoutsByType,
  getPageTypes,
  sanitizeAllowedBlocks,
  sanitizeBlocks,
  sanitizeFields,
} from '@pruvious/shared'
import { isObject, isUrl, isUrlPath, lowercaseFirstLetter, trimAll } from '@pruvious/utils'
import {
  blocks,
  collectionsConfig,
  config,
  pageConfig,
  presetConfig,
  roleConfig,
  userConfig,
  validators,
} from 'App/imports'
import Page from 'App/Models/Page'
import Post from 'App/Models/Post'
import Preset from 'App/Models/Preset'
import Role from 'App/Models/Role'
import Upload from 'App/Models/Upload'
import User from 'App/Models/User'
import { queryPages, sanitizeAllowedPageBlocks } from 'App/PageQuery'
import { queryPosts } from 'App/PostQuery'
import {
  RelationMap,
  validateRelationalBlockFields,
  validateRelationalFields,
} from 'App/relation-validator'
import { getTranslations, LanguageType } from 'App/translations'
import { queryUploads } from 'App/UploadQuery'
import { listCapabilities, queryUsers } from 'App/UserQuery'

/*
|--------------------------------------------------------------------------
| Path part
|--------------------------------------------------------------------------
|
*/

validator.rule('pathPart', (value, _, options) => {
  if (typeof value !== 'string') {
    return options.errorReporter.report(options.pointer, 'pathPart', 'The path must be a string')
  }

  if (value.includes('/') || value.toLowerCase() !== value || !isUrlPath(`/${value}`)) {
    return options.errorReporter.report(options.pointer, 'pathPart', 'Invalid path')
  }
})

/*
|--------------------------------------------------------------------------
| Page path
|--------------------------------------------------------------------------
|
*/

validator.rule(
  'pagePath',
  async (value, [id], options) => {
    value = value === '/' ? value : trimAll(value).replace(/\/\/*/g, '/').replace(/\/*$/, '')

    if (typeof value !== 'string') {
      return options.errorReporter.report(options.pointer, 'pagePath', 'The path must be a string')
    } else if (!value.startsWith('/')) {
      return options.errorReporter.report(options.pointer, 'pagePath', 'The path must begin with /')
    } else if (!isUrlPath(value)) {
      return options.errorReporter.report(options.pointer, 'pagePath', 'Invalid path')
    } else if (['/__preset', 'robots.txt'].includes(value) || value.startsWith('/sitemap.xml')) {
      return options.errorReporter.report(options.pointer, 'pagePath', 'This path is reserved')
    }

    const existing = await Database.rawQuery(
      'select * from pages where UPPER(path) = ? and id != ?',
      [value.toUpperCase(), id],
    ).exec()

    if (existing.length) {
      return options.errorReporter.report(
        options.pointer,
        'pagePath',
        `A ${lowercaseFirstLetter(
          pageConfig.labels!.item!.singular,
        )} with this path already exists`,
      )
    }
  },
  () => ({ async: true }),
)

/*
|--------------------------------------------------------------------------
| Page type
|--------------------------------------------------------------------------
|
*/

validator.rule('pageType', (value, _, options) => {
  if (typeof value !== 'string') {
    return options.errorReporter.report(
      options.pointer,
      'pageType',
      'The page type must be a string',
    )
  }

  if (!getPageTypes(pageConfig).includes(value)) {
    return options.errorReporter.report(options.pointer, 'pageType', 'Page type does not exist')
  }
})

/*
|--------------------------------------------------------------------------
| Page layout
|--------------------------------------------------------------------------
|
*/

validator.rule('pageLayout', (value, [type], options) => {
  if (typeof value !== 'string') {
    return options.errorReporter.report(
      options.pointer,
      'pageLayout',
      'The layout name must be a string',
    )
  }

  if (!getPageLayouts(pageConfig).includes(value)) {
    return options.errorReporter.report(options.pointer, 'pageLayout', 'Layout does not exist')
  } else if (typeof type === 'string' && !getPageLayoutsByType(type, pageConfig).includes(value)) {
    return options.errorReporter.report(
      options.pointer,
      'pageLayout',
      'The layout cannot be assigned to the selected page type',
    )
  }
})

/*
|--------------------------------------------------------------------------
| Block records
|--------------------------------------------------------------------------
|
*/

validator.rule(
  'blockRecords',
  async (value, [conditionalLogic, forbiddenBlocks, draft], options) => {
    if (!Array.isArray(value)) {
      return options.errorReporter.report(
        options.pointer,
        'blockRecords',
        'Blocks must be an array',
      )
    }

    try {
      const { sanitizedBlockRecords, errors } = await sanitizeBlocks(
        value,
        blocks,
        conditionalLogic,
        undefined,
        forbiddenBlocks,
        !!draft,
        validators,
      )

      errors.forEach((error) => {
        options.errorReporter.report(error.field, 'blockRecords', error.message)
      })

      const relations = extractSpecialBlocks(sanitizedBlockRecords, blocks)
      const relationMap = await fieldRelationHelper(relations)

      relationMap.errors.forEach((error) => {
        options.errorReporter.report(error.pointer, error.rule, error.message)
      })

      validateRelationalBlockFields(sanitizedBlockRecords, relationMap).forEach((error) => {
        options.errorReporter.report(error.field, 'fieldRecords', error.message)
      })
    } catch (e) {
      options.errorReporter.report('_pruvious', 'blockRecords', `Block validation failed: ${e}`)
    }
  },
  () => ({ async: true }),
)

/*
|--------------------------------------------------------------------------
| Allowed page blocks
|--------------------------------------------------------------------------
|
*/

validator.rule(
  'allowedPageBlocks',
  async (value, [page], options) => {
    if (!Array.isArray(value)) {
      return options.errorReporter.report(
        options.pointer,
        'blockRecords',
        'Blocks must be an array',
      )
    }

    try {
      const { errors } = sanitizeAllowedPageBlocks(page)

      errors.forEach((error) => {
        options.errorReporter.report(error.blockId, 'allowedPageBlocks', error.message)
      })
    } catch (e) {
      options.errorReporter.report(
        '_pruvious',
        'allowedPageBlocks',
        `Allowed page block validation failed: ${e}`,
      )
    }
  },
  () => ({ async: true }),
)

/*
|--------------------------------------------------------------------------
| Allowed preset blocks
|--------------------------------------------------------------------------
|
*/

validator.rule(
  'allowedPresetBlocks',
  async (value, _, options) => {
    if (!Array.isArray(value)) {
      return options.errorReporter.report(
        options.pointer,
        'blockRecords',
        'Blocks must be an array',
      )
    }

    try {
      const blockNames = blocks
        .map((block) => block.name)
        .filter((blockName) => blockName !== 'Filter')
      const { errors } = sanitizeAllowedBlocks(value, blocks, blockNames, blockNames)

      errors.forEach((error) => {
        options.errorReporter.report(error.blockId, 'allowedPresetBlocks', error.message)
      })
    } catch (e) {
      options.errorReporter.report(
        '_pruvious',
        'allowedPresetBlocks',
        `Allowed block validation failed: ${e}`,
      )
    }
  },
  () => ({ async: true }),
)

/*
|--------------------------------------------------------------------------
| Field records
|--------------------------------------------------------------------------
|
*/

validator.rule(
  'fieldRecords',
  async (
    value,
    [fields, conditionalLogic, model, modelId, language, draft, collection]: [
      (Field | FieldGroup)[],
      ConditionalLogic,
      'page' | 'upload' | 'post' | 'user' | undefined,
      number | undefined,
      string | undefined,
      boolean | undefined,
      string | undefined,
    ],
    options,
  ) => {
    if (!isObject(value)) {
      return options.errorReporter.report(
        options.pointer,
        'fieldRecords',
        'Fields must be an object',
      )
    }

    try {
      const { sanitizedFieldRecords, errors } = await sanitizeFields(
        value,
        fields,
        conditionalLogic,
        '',
        '',
        !!draft,
        validators,
      )

      errors.forEach((error) => {
        options.errorReporter.report(error.field, 'fieldRecords', error.message)
      })

      const relations = extractSpecialFields(sanitizedFieldRecords, fields)
      const relationMap = await fieldRelationHelper(relations)

      relationMap.errors.forEach((error) => {
        options.errorReporter.report(error.pointer, error.rule, error.message)
      })

      validateRelationalFields(sanitizedFieldRecords, fields, relationMap).forEach((error) => {
        options.errorReporter.report(error.field, 'fieldRecords', error.message)
      })

      if (model) {
        for (const field of flattenFields(fields)) {
          if ((field as any).unique) {
            const preparedValue = prepareFieldValueHelper(value[field.name], field)

            if (preparedValue === undefined) {
              continue
            }

            const countQuery =
              model === 'page'
                ? queryPages()
                : model === 'upload'
                ? queryUploads()
                : model === 'post'
                ? queryPosts(collection as any)
                : queryUsers()
            const countResult = (countQuery as any)
              .whereNot('id', modelId ?? 0)
              .andWhere(field.name, preparedValue)

            if (modelId) {
              const modelQuery =
                model === 'page'
                  ? queryPages()
                  : model === 'upload'
                  ? queryUploads()
                  : model === 'post'
                  ? queryPosts(collection as any)
                  : queryUsers()
              const language = ((await modelQuery.select('language').find(modelId)) as any)
                ?.language

              if (language && (countQuery as any).language) {
                ;(countQuery as any).language(language)
              }
            } else if ((countQuery as any).language && typeof language === 'string') {
              ;(countQuery as any).language(language)
            }

            if (await countResult.count()) {
              options.errorReporter.report(
                field.name,
                'fieldRecords',
                'This field must be unique for all ' +
                  lowercaseFirstLetter(
                    model === 'page'
                      ? pageConfig.labels!.item!.plural
                      : model === 'upload'
                      ? 'uploads'
                      : model === 'post'
                      ? collectionsConfig[collection!].labels!.item!.plural
                      : userConfig.labels!.item!.plural,
                  ),
              )
            }
          }
        }
      }
    } catch (e) {
      options.errorReporter.report('_pruvious', 'fieldRecords', `Field validation failed: ${e}`)
    }
  },
  () => ({ async: true }),
)

async function fieldRelationHelper(relations: ExtractedFields): Promise<RelationMap> {
  const pages: Record<number, Page> = {}
  const presets: Record<number, Preset> = {}
  const uploads: Record<number, Upload> = {}
  const posts: Record<number, Post> = {}
  const roles: Record<number, Role> = {}
  const users: Record<number, User> = {}
  const errors: { pointer: string; rule: string; message?: string | undefined }[] = []

  for (const [pageId, locations] of Object.entries(relations.pageIds)) {
    const page = await Page.find(pageId)

    if (page) {
      page[pageId] = page
    } else {
      locations.forEach(({ fullId, field, fieldRecords, blockRecord }) => {
        if (field.type === 'editor') {
          const value = blockRecord?.props
            ? blockRecord!.props![field.name]
            : fieldRecords
            ? fieldRecords[field.name]
            : ''
          const match = new RegExp(`href="\\$${pageId}"[^>]*?>(.+?)<\/a>`, 'gi').exec(value)

          errors.push({
            pointer: fullId,
            rule: 'fieldRecords',
            message: match
              ? `The link "${match[1]}" is broken`
              : `${pageConfig.labels!.item!.singular} with the ID ${pageId} does not exist`,
          })
        } else {
          errors.push({
            pointer: fullId,
            rule: 'fieldRecords',
            message: `${pageConfig.labels!.item!.singular} does not exist`,
          })
        }
      })
    }
  }

  for (const [presetId, presetBlockIds] of Object.entries(relations.presetIds)) {
    const preset = await Preset.find(presetId)

    if (preset) {
      presets[presetId] = preset
    } else {
      presetBlockIds.forEach(({ fullId }) => {
        errors.push({
          pointer: fullId,
          rule: 'fieldRecords',
          message: `${presetConfig.labels!.item!.singular} does not exist`,
        })
      })
    }
  }

  for (const [uploadId, uploadBlockIds] of Object.entries(relations.uploadIds)) {
    const upload = await Upload.find(uploadId)

    if (upload) {
      uploads[uploadId] = upload
    } else {
      uploadBlockIds.forEach(({ field, fullId }) => {
        errors.push({
          pointer: fullId,
          rule: 'fieldRecords',
          message: field.type === 'image' ? 'The image does not exist' : 'File does not exist',
        })
      })
    }
  }

  for (const [postId, postBlockIds] of Object.entries(relations.postIds)) {
    const post = await Post.find(postId)

    if (post) {
      posts[postId] = post
    } else {
      postBlockIds.forEach(({ fullId, field }) => {
        errors.push({
          pointer: fullId,
          rule: 'fieldRecords',
          message:
            (field.collection && collectionsConfig[field.collection]
              ? collectionsConfig[field.collection].labels!.item!.singular
              : 'Post') + ' does not exist',
        })
      })
    }
  }

  for (const [roleId, roleBlockIds] of Object.entries(relations.roleIds)) {
    const role = await Role.find(roleId)

    if (role) {
      roles[roleId] = role
    } else {
      roleBlockIds.forEach(({ fullId }) => {
        errors.push({
          pointer: fullId,
          rule: 'fieldRecords',
          message: `${roleConfig.labels!.item!.singular} does not exist`,
        })
      })
    }
  }

  for (const [userId, userBlockIds] of Object.entries(relations.userIds)) {
    const user = await User.find(userId)

    if (user) {
      users[userId] = user
    } else {
      userBlockIds.forEach(({ fullId }) => {
        errors.push({
          pointer: fullId,
          rule: 'fieldRecords',
          message: `${userConfig.labels!.item!.singular} does not exist`,
        })
      })
    }
  }

  return { pages, presets, uploads, posts, roles, users, errors }
}

function prepareFieldValueHelper(value: any, field: Field): any {
  if (value === null) {
    return null
  } else if (value === undefined) {
    return undefined
  }

  const type = getFieldValueType(field)

  if (type === 'string') {
    try {
      return value.toString()
    } catch (e) {
      return undefined
    }
  } else if (type === 'number') {
    return +value
  } else if (type === 'boolean') {
    return value === 'true' || value === 't' ? 1 : value === 'false' || value === 'f' ? 0 : +!!value
  }

  return undefined
}

/*
|--------------------------------------------------------------------------
| Language
|--------------------------------------------------------------------------
|
*/

validator.rule('language', (value, _, options) => {
  if (typeof value !== 'string') {
    return options.errorReporter.report(
      options.pointer,
      'language',
      'The language code must be a string',
    )
  }

  const languageCodes = config.languages?.map((language) => language.code) ?? []

  if (!languageCodes.includes(value)) {
    return options.errorReporter.report('language', 'language', 'Language code does not exist')
  }
})

/*
|--------------------------------------------------------------------------
| Translation of
|--------------------------------------------------------------------------
|
*/

validator.rule(
  'translationOf',
  async (value, [model, language]: [LanguageType, string], options) => {
    if (typeof value !== 'number') {
      return options.errorReporter.report(
        options.pointer,
        'translationOf',
        'The translation ID must be a number',
      )
    }

    if (!language) {
      language = config.defaultLanguage!
    }

    const translations = await getTranslations(model, value)

    if (translations && translations[language]) {
      return options.errorReporter.report(
        'translationOf',
        'translationOf',
        'A translation with this language already exists',
      )
    }
  },
  () => ({ async: true }),
)

/*
|--------------------------------------------------------------------------
| Capability
|--------------------------------------------------------------------------
|
*/

validator.rule('capability', (value, _, options) => {
  if (typeof value !== 'string') {
    return options.errorReporter.report(
      options.pointer,
      'capability',
      'The capability name must be a string',
    )
  }

  if (!listCapabilities().includes(value as any)) {
    return options.errorReporter.report('capability', 'capability', 'Invalid capability name')
  }
})

/*
|--------------------------------------------------------------------------
| Destroy many
|--------------------------------------------------------------------------
|
*/

validator.rule('destroyMany', (value, _, options) => {
  if (value.includes('*')) {
    return
  }

  for (const id of value) {
    if (typeof id !== 'number') {
      return options.errorReporter.report(
        options.pointer,
        'destroyMany',
        'The array elements must be numbers',
      )
    }
  }
})

/*
|--------------------------------------------------------------------------
| Redirect
|--------------------------------------------------------------------------
|
*/

validator.rule('redirect', (value, _, options) => {
  const match = value.match
  const redirectTo = value.redirectTo
  const isRegex = value.isRegex
  const isPermanent = value.isPermanent

  if (typeof match !== 'string') {
    options.errorReporter.report(
      `${options.pointer}.match`,
      'redirect',
      'This field must be a string',
    )
  } else if (!match.trim()) {
    options.errorReporter.report(`${options.pointer}.match`, 'redirect', 'This field is required')
  } else if (!isRegex && !match.startsWith('/')) {
    options.errorReporter.report(
      `${options.pointer}.match`,
      'redirect',
      'The path must begin with /',
    )
  } else if (!isRegex && match !== '/' && match.endsWith('/')) {
    options.errorReporter.report(
      `${options.pointer}.match`,
      'redirect',
      'The path cannot end with /',
    )
  } else if (!isRegex && !isUrlPath(match)) {
    options.errorReporter.report(`${options.pointer}.match`, 'redirect', 'Invalid path')
  }

  if (typeof redirectTo !== 'string') {
    options.errorReporter.report(
      `${options.pointer}.redirectTo`,
      'redirect',
      'This field must be a string',
    )
  } else if (!redirectTo.trim()) {
    options.errorReporter.report(
      `${options.pointer}.redirectTo`,
      'redirect',
      'This field is required',
    )
  } else if (!redirectTo.startsWith('http') && !redirectTo.startsWith('/')) {
    options.errorReporter.report(
      `${options.pointer}.redirectTo`,
      'redirect',
      'The path must begin with /',
    )
  } else if (!redirectTo.startsWith('http') && redirectTo !== '/' && redirectTo.endsWith('/')) {
    options.errorReporter.report(
      `${options.pointer}.redirectTo`,
      'redirect',
      'The path cannot end with /',
    )
  } else if (!redirectTo.startsWith('http') && !isUrl(`http://__pruvious${redirectTo}`)) {
    options.errorReporter.report(`${options.pointer}.redirectTo`, 'redirect', 'Invalid path')
  } else if (redirectTo.startsWith('http') && !isUrl(redirectTo)) {
    options.errorReporter.report(`${options.pointer}.redirectTo`, 'redirect', 'Invalid URL')
  }

  if (typeof isRegex !== 'boolean') {
    options.errorReporter.report(
      `${options.pointer}.isRegex`,
      'redirect',
      'This field must be a boolean value',
    )
  }

  if (typeof isPermanent !== 'boolean') {
    options.errorReporter.report(
      `${options.pointer}.isPermanent`,
      'redirect',
      'This field must be a boolean value',
    )
  }

  if (typeof isRegex === 'boolean' && isRegex) {
    try {
      new RegExp(match)
    } catch (e) {
      options.errorReporter.report(`${options.pointer}.match`, 'redirect', e.toString())
    }
  }
})
