import {
  Field,
  QueryableField,
  creatableStandardCollectionColumns,
  creatableStandardPageColumns,
  creatableStandardPresetColumns,
  creatableStandardRoleColumns,
  creatableStandardUploadColumns,
  creatableStandardUserColumns,
  flattenFields,
  getFieldValueType,
  getPageLayouts,
  getPageTypes,
  isFilterableField,
  isSortableField,
  standardCollectionColumns,
  standardCollectionFields,
  standardPageColumns,
  standardPageFields,
  standardPresetColumns,
  standardPresetFields,
  standardRoleColumns,
  standardRoleFields,
  standardUploadColumns,
  standardUploadFields,
  standardUserColumns,
  standardUserFields,
  updateableStandardCollectionColumns,
  updateableStandardPageColumns,
  updateableStandardPresetColumns,
  updateableStandardRoleColumns,
  updateableStandardUploadColumns,
  updateableStandardUserColumns,
} from '@pruvious/shared'
import fs from 'fs-extra'
import path from 'path'
import { listCapabilities } from './UserQuery'
import { pruvDir } from './helpers'
import {
  actions,
  blocks,
  collectionsConfig,
  config,
  icons,
  pageConfig,
  settingConfigs,
  uploadConfig,
  userConfig,
  validators,
} from './imports'

export function createTypes() {
  const typesDir = path.resolve(pruvDir(), '.types')
  const content: string[] = [
    "import { BlockRecord, Image, Link, Size } from '@pruvious/shared'",
    '',
    'declare namespace Pruvious {',
  ]
  const languages = toStringLiterals(config.languages!.map((language) => language.code))

  fs.ensureDirSync(typesDir)
  fs.emptyDirSync(typesDir)

  content.push(`  export type LanguageCode = ${languages}`)
  content.push(`  export type DefaultLanguage = '${config.defaultLanguage}'`)
  content.push('  export type Languages = [')

  for (const language of config.languages!) {
    content.push(`    { code: '${language.code}', label: '${language.label}' },`)
  }

  content.push('  ]')
  content.push(`  export type BlockName = ${toStringLiterals(blocks.map((block) => block.name))}`)
  content.push('  export interface Block {')

  for (const block of blocks) {
    content.push(`    ${block.name}: ${JSON.stringify(block)}`)
  }

  content.push('  }')
  content.push(
    `  export type FieldStub = ${toStringLiterals(Object.keys(config.fieldStubs ?? {}))}`,
  )
  content.push(`  export type Validator = ${toStringLiterals(Object.keys(validators))}`)
  content.push(
    `  export type Job = ${toStringLiterals((config.jobs ?? []).map((job) => job.name))}`,
  )
  content.push(`  export type Action = ${toStringLiterals(Object.keys(actions))}`)

  /*
  |
  | Pages
  |
  */

  if (config.pages !== false) {
    const customPageFields: QueryableField[] = flattenFields(pageConfig.fields ?? [])

    content.push('  export interface Page {')

    for (const field of standardPageFields) {
      if (field.name === 'blocks') {
        content.push(`    ${field.name}: BlockRecord[]`)
      } else if (field.name === 'language') {
        content.push(`    ${field.name}: ${languages}`)
      } else if (field.name === 'layout') {
        content.push(`    ${field.name}: ${toStringLiterals(getPageLayouts(pageConfig))}`)
      } else if (field.name === 'type') {
        content.push(`    ${field.name}: ${toStringLiterals(getPageTypes(pageConfig))}`)
      } else {
        content.push(createComment(field, '    '))
        content.push(`    ${field.name}: ${getFieldType(field, '    ')}`)
      }
    }

    content.push(
      createComment(null, '    ', [
        'A unique token required when previewing pages in draft mode.',
        '',
        'Note: This is a computed field and cannot be queried.',
      ]),
      '    draftToken: string',
      createComment(null, '    ', [
        'A key-value object of published page translations. The key represents the language code, while the value is an object that contains basic information about the translation.',
        '',
        'Note: This is a computed field and cannot be queried.',
      ]),
      '    translations: {',
      ...config.languages!.map((language) => {
        return [
          `      ${language.code}?: {`,
          '        id: number',
          '        path: string',
          '        url: string',
          '      } | null',
        ].join('\n')
      }),
      '    }',
      createComment(null, '    ', [
        'The file URL.',
        '',
        'Note: This is a computed field and cannot be queried.',
      ]),
      '    url: string',
    )

    for (const field of customPageFields) {
      content.push(createComment(field, '    '))
      content.push(`    ${field.name}: ${getFieldType(field, '    ')}`)
    }

    content.push('  }', '  export interface PageInput {')

    for (const field of standardPageFields) {
      if (field.name === 'blocks') {
        content.push(`    ${field.name}: BlockRecord[]`)
      } else if (field.name === 'language') {
        content.push(
          `    ${field.name}: ${languages}`,
          createComment(null, '    ', ['The ID of the page this page is a translation of.']),
          '    translationOf: number',
        )
      } else if (field.name === 'layout') {
        content.push(`    ${field.name}: ${toStringLiterals(getPageLayouts(pageConfig))}`)
      } else if (field.name === 'type') {
        content.push(`    ${field.name}: ${toStringLiterals(getPageTypes(pageConfig))}`)
      } else {
        content.push(createComment(field, '    '))
        content.push(`    ${field.name}: ${getFieldInputType(field, '    ')}`)
      }
    }

    for (const field of customPageFields) {
      content.push(createComment(field, '    '))
      content.push(`    ${field.name}: ${getFieldInputType(field, '    ')}`)
    }

    content.push(
      '  }',
      `  export type StandardPageField = ${toStringLiterals(
        standardPageFields.map((field) => field.name),
      )}`,
      `  export type CustomPageField = ${toStringLiterals(
        customPageFields.map((field) => field.name),
      )}`,
      "  export type ComputedPageField = 'draftToken' | 'translations' | 'url'",
      `  export type CreatablePageField = ${toStringLiterals([
        ...creatableStandardPageColumns,
        ...customPageFields.map((field) => field.name),
      ])}`,
      `  export type SelectablePageField = ${toStringLiterals([
        ...standardPageFields.map((field) => field.name),
        ...customPageFields
          .filter((field) => field.selectable !== false)
          .map((field) => field.name),
      ])}`,
      `  export type SortablePageField = ${toStringLiterals([
        ...standardPageFields.filter((field) => isSortableField(field)).map((field) => field.name),
        ...customPageFields.filter((field) => isSortableField(field)).map((field) => field.name),
      ])}`,
      `  export type FilterablePageField = ${toStringLiterals([
        ...standardPageFields
          .filter((field) => isFilterableField(field))
          .map((field) => field.name),
        ...customPageFields.filter((field) => isFilterableField(field)).map((field) => field.name),
      ])}`,
      `  export type UpdateablePageField = ${toStringLiterals([
        ...updateableStandardPageColumns,
        ...customPageFields.filter((field) => !field.readonly).map((field) => field.name),
      ])}`,
      `  export type RequiredPageField = ${toStringLiterals([
        ...standardPageFields.filter(isRequired).map((field) => field.name),
        ...customPageFields.filter(isRequired).map((field) => field.name),
      ])}`,
      `  export type PageStringField = ${toStringLiterals([
        ...Object.entries(standardPageColumns)
          .filter(([_, type]) => type === 'string')
          .map(([field]) => field),
        ...customPageFields
          .filter((field) => getFieldValueType(field) === 'string')
          .map((field) => field.name),
      ])}`,
      `  export type PageNumberField = ${toStringLiterals([
        ...Object.entries(standardPageColumns)
          .filter(([_, type]) => type === 'number' || type === 'dateTime')
          .map(([field]) => field),
        ...customPageFields
          .filter((field) => getFieldValueType(field) === 'number')
          .map((field) => field.name),
      ])}`,
      `  export type PageBooleanField = ${toStringLiterals([
        ...Object.entries(standardPageColumns)
          .filter(([_, type]) => type === 'boolean')
          .map(([field]) => field),
        ...customPageFields
          .filter((field) => getFieldValueType(field) === 'boolean')
          .map((field) => field.name),
      ])}`,
    )
  }

  /*
  |
  | Presets
  |
  */

  if (config.presets !== false) {
    content.push('  export interface Preset {')

    for (const field of standardPresetFields) {
      if (field.name === 'blocks') {
        content.push(`    ${field.name}: BlockRecord[]`)
      } else if (field.name === 'language') {
        content.push(`    ${field.name}: ${languages}`)
      } else {
        content.push(createComment(field, '    '))
        content.push(`    ${field.name}: ${getFieldType(field, '    ')}`)
      }
    }

    content.push(
      createComment(null, '    ', [
        'A key-value object of preset translations. The key represents the language code, while the value is an object that contains basic information about the translation.',
        '',
        'Note: This is a computed field and cannot be queried.',
      ]),
      '    translations: {',
      ...config.languages!.map((language) => {
        return [`      ${language.code}?: {`, '        id: number', '      } | null'].join('\n')
      }),
      '    }',
    )

    content.push('  }', '  export interface PresetInput {')

    for (const field of standardPresetFields) {
      if (field.name === 'blocks') {
        content.push(`    ${field.name}: BlockRecord[]`)
      } else if (field.name === 'language') {
        content.push(
          `    ${field.name}: ${languages}`,
          createComment(null, '    ', ['The ID of the preset this preset is a translation of.']),
          '    translationOf: number',
        )
      } else {
        content.push(createComment(field, '    '))
        content.push(`    ${field.name}: ${getFieldInputType(field, '    ')}`)
      }
    }

    content.push(
      '  }',
      `  export type StandardPresetField = ${toStringLiterals(
        standardPresetFields.map((field) => field.name),
      )}`,
      '  export type CustomPresetField = never',
      "  export type ComputedPresetField = 'translations'",
      `  export type CreatablePresetField = ${toStringLiterals(creatableStandardPresetColumns)}`,
      `  export type SelectablePresetField = ${toStringLiterals(
        standardPresetFields.map((field) => field.name),
      )}`,
      `  export type SortablePresetField = ${toStringLiterals(
        standardPresetFields.filter((field) => isSortableField(field)).map((field) => field.name),
      )}`,
      `  export type FilterablePresetField = ${toStringLiterals(
        standardPresetFields.filter((field) => isFilterableField(field)).map((field) => field.name),
      )}`,
      `  export type UpdateablePresetField = ${toStringLiterals(updateableStandardPresetColumns)}`,
      `  export type RequiredPresetField = ${toStringLiterals(
        standardPresetFields.filter(isRequired).map((field) => field.name),
      )}`,
      `  export type PresetStringField = ${toStringLiterals(
        Object.entries(standardPresetColumns)
          .filter(([_, type]) => type === 'string')
          .map(([field]) => field),
      )}`,
      `  export type PresetNumberField = ${toStringLiterals(
        Object.entries(standardPresetColumns)
          .filter(([_, type]) => type === 'number' || type === 'dateTime')
          .map(([field]) => field),
      )}`,
      `  export type PresetBooleanField = ${toStringLiterals(
        Object.entries(standardPresetColumns)
          .filter(([_, type]) => type === 'boolean')
          .map(([field]) => field),
      )}`,
    )
  }

  /*
  |
  | Uploads
  |
  */

  if (config.uploads !== false) {
    const customUploadFields: QueryableField[] = flattenFields(uploadConfig.fields ?? [])

    content.push('  export interface Upload {')

    for (const field of standardUploadFields) {
      content.push(createComment(field, '    '))
      content.push(`    ${field.name}: ${getFieldType(field, '    ')}`)
    }

    content.push(
      createComment(null, '    ', [
        'The file URL.',
        '',
        'Note: This is a computed field and cannot be queried.',
      ]),
      '    url: string',
      createComment(null, '    ', [
        'The directory object of the upload.',
        '',
        'Note: This is a computed field and cannot be queried.',
      ]),
      '    directory: {',
      '      id: number',
      '      path: string',
      '      name: string',
      '    }',
    )

    for (const field of customUploadFields) {
      content.push(createComment(field, '    '))
      content.push(`    ${field.name}: ${getFieldType(field, '    ')}`)
    }

    content.push('  }', '  export interface UploadInput {')

    for (const field of standardUploadFields) {
      content.push(createComment(field, '    '))
      content.push(`    ${field.name}: ${getFieldInputType(field, '    ')}`)
    }

    for (const field of customUploadFields) {
      content.push(createComment(field, '    '))
      content.push(`    ${field.name}: ${getFieldInputType(field, '    ')}`)
    }

    content.push(
      '  }',
      `  export type StandardUploadField = ${toStringLiterals(
        standardUploadFields.map((field) => field.name),
      )}`,
      `  export type CustomUploadField = ${toStringLiterals(
        customUploadFields.map((field) => field.name),
      )}`,
      "  export type ComputedUploadField = 'directory' | 'url'",
      `  export type CreatableUploadField = ${toStringLiterals([
        ...creatableStandardUploadColumns,
        ...customUploadFields.map((field) => field.name),
      ])}`,
      `  export type SelectableUploadField = ${toStringLiterals([
        ...standardUploadFields.map((field) => field.name),
        ...customUploadFields
          .filter((field) => field.selectable !== false)
          .map((field) => field.name),
      ])}`,
      `  export type SortableUploadField = ${toStringLiterals([
        ...standardUploadFields
          .filter((field) => isSortableField(field))
          .map((field) => field.name),
        ...customUploadFields.filter((field) => isSortableField(field)).map((field) => field.name),
      ])}`,
      `  export type FilterableUploadField = ${toStringLiterals([
        ...standardUploadFields
          .filter((field) => isFilterableField(field))
          .map((field) => field.name),
        ...customUploadFields
          .filter((field) => isFilterableField(field))
          .map((field) => field.name),
      ])}`,
      `  export type UpdateableUploadField = ${toStringLiterals([
        ...updateableStandardUploadColumns,
        ...customUploadFields.filter((field) => !field.readonly).map((field) => field.name),
      ])}`,
      `  export type RequiredUploadField = ${toStringLiterals([
        ...standardUploadFields.filter(isRequired).map((field) => field.name),
        ...customUploadFields.filter(isRequired).map((field) => field.name),
      ])}`,
      `  export type UploadStringField = ${toStringLiterals([
        ...Object.entries(standardUploadColumns)
          .filter(([_, type]) => type === 'string')
          .map(([field]) => field),
        ...customUploadFields
          .filter((field) => getFieldValueType(field) === 'string')
          .map((field) => field.name),
      ])}`,
      `  export type UploadNumberField = ${toStringLiterals([
        ...Object.entries(standardUploadColumns)
          .filter(([_, type]) => type === 'number' || type === 'dateTime')
          .map(([field]) => field),
        ...customUploadFields
          .filter((field) => getFieldValueType(field) === 'number')
          .map((field) => field.name),
      ])}`,
      `  export type UploadBooleanField = ${toStringLiterals([
        ...Object.entries(standardUploadColumns)
          .filter(([_, type]) => type === 'boolean')
          .map(([field]) => field),
        ...customUploadFields
          .filter((field) => getFieldValueType(field) === 'boolean')
          .map((field) => field.name),
      ])}`,
    )
  }

  /*
  |
  | Posts
  |
  */

  content.push(
    `  export type Collection = ${toStringLiterals(Object.keys(collectionsConfig))}`,
    '  export interface Post {',
  )

  for (const collection of Object.values(collectionsConfig)) {
    content.push(`    '${collection.name}': {`)

    for (const field of standardCollectionFields) {
      if (field.name === 'language') {
        content.push(
          `      ${field.name}: ${
            collection.translatable ? languages : `'${config.defaultLanguage}'`
          }`,
        )
      } else {
        content.push(createComment(field, '      '))
        content.push(`      ${field.name}: ${getFieldType(field, '      ')}`)
      }
    }

    content.push(
      createComment(null, '      ', [
        'A key-value object of published post translations. The key represents the language code, while the value is an object that contains basic information about the translation.',
        '',
        'Note: This is a computed field and cannot be queried.',
      ]),
    )

    if (collection.translatable) {
      content.push(
        '      translations: {',
        ...config.languages!.map((language) => {
          return [`        ${language.code}?: {`, '          id: number', '        } | null'].join(
            '\n',
          )
        }),
        '      }',
      )
    } else {
      content.push('      translations: {}')
    }

    for (const field of flattenFields(collection.fields ?? [])) {
      content.push(createComment(field, '      '))
      content.push(`      ${field.name}: ${getFieldType(field, '      ')}`)
    }

    content.push('    }')
  }

  content.push('  }', '  export interface PostInput {')

  for (const collection of Object.values(collectionsConfig)) {
    content.push(`    '${collection.name}': {`)

    for (const field of standardCollectionFields) {
      if (field.name === 'language') {
        content.push(
          `      ${field.name}: ${
            collection.translatable ? languages : `'${config.defaultLanguage}'`
          }`,
          createComment(null, '      ', [
            'The ID of the post this post is a translation of.',
            '',
            'Note: This field has no effect if the collection is not translatable.',
          ]),
          '      translationOf: number',
        )
      } else {
        content.push(createComment(field, '      '))
        content.push(`      ${field.name}: ${getFieldInputType(field, '    ')}`)
      }
    }

    for (const field of flattenFields(collection.fields ?? [])) {
      content.push(createComment(field, '      '))
      content.push(`      ${field.name}: ${getFieldInputType(field, '      ')}`)
    }

    content.push('    }')
  }

  content.push(
    '  }',
    `  export type StandardPostField = ${toStringLiterals(
      standardCollectionFields.map((field) => field.name),
    )}`,
    '  export interface CustomPostField {',
  )

  for (const collection of Object.values(collectionsConfig)) {
    content.push(
      `    '${collection.name}': ${toStringLiterals(
        flattenFields(collection.fields ?? []).map((field) => field.name),
      )}`,
    )
  }

  content.push('  }', "  export type ComputedPostField = 'translations'")

  content.push('  export interface CreatablePostField {')
  for (const collection of Object.values(collectionsConfig)) {
    content.push(
      `    '${collection.name}': ${toStringLiterals([
        ...creatableStandardCollectionColumns,
        ...flattenFields(collection.fields ?? []).map((field) => field.name),
      ])}`,
    )
  }
  content.push('  }', '  export interface SelectablePostField {')
  for (const collection of Object.values(collectionsConfig)) {
    content.push(
      `    '${collection.name}': ${toStringLiterals([
        ...standardCollectionFields.map((field) => field.name),
        ...flattenFields(collection.fields ?? [])
          .filter((field: QueryableField) => field.selectable !== false)
          .map((field) => field.name),
      ])}`,
    )
  }
  content.push('  }', '  export interface SortablePostField {')
  for (const collection of Object.values(collectionsConfig)) {
    content.push(
      `    '${collection.name}': ${toStringLiterals([
        ...standardCollectionFields
          .filter((field) => isSortableField(field))
          .map((field) => field.name),
        ...flattenFields(collection.fields ?? [])
          .filter((field) => isSortableField(field))
          .map((field) => field.name),
      ])}`,
    )
  }
  content.push('  }', '  export interface FilterablePostField {')
  for (const collection of Object.values(collectionsConfig)) {
    content.push(
      `    '${collection.name}': ${toStringLiterals([
        ...standardCollectionFields
          .filter((field) => isFilterableField(field))
          .map((field) => field.name),
        ...flattenFields(collection.fields ?? [])
          .filter((field) => isFilterableField(field))
          .map((field) => field.name),
      ])}`,
    )
  }
  content.push('  }', '  export interface UpdateablePostField {')
  for (const collection of Object.values(collectionsConfig)) {
    content.push(
      `    '${collection.name}': ${toStringLiterals([
        ...updateableStandardCollectionColumns,
        ...flattenFields(collection.fields ?? [])
          .filter((field: QueryableField) => !field.readonly)
          .map((field) => field.name),
      ])}`,
    )
  }
  content.push('  }', '  export interface RequiredPostField {')
  for (const collection of Object.values(collectionsConfig)) {
    content.push(
      `    '${collection.name}': ${toStringLiterals([
        ...standardCollectionFields.filter(isRequired).map((field) => field.name),
        ...flattenFields(collection.fields ?? [])
          .filter(isRequired)
          .map((field) => field.name),
      ])}`,
    )
  }
  content.push('  }', '  export interface PostStringField {')
  for (const collection of Object.values(collectionsConfig)) {
    content.push(
      `    '${collection.name}': ${toStringLiterals([
        ...Object.entries(standardCollectionColumns)
          .filter(([_, type]) => type === 'string')
          .map(([field]) => field),
        ...flattenFields(collection.fields ?? [])
          .filter((field) => getFieldValueType(field) === 'string')
          .map((field) => field.name),
      ])}`,
    )
  }
  content.push('  }', '  export interface PostNumberField {')
  for (const collection of Object.values(collectionsConfig)) {
    content.push(
      `    '${collection.name}': ${toStringLiterals([
        ...Object.entries(standardCollectionColumns)
          .filter(([_, type]) => type === 'number' || type === 'dateTime')
          .map(([field]) => field),
        ...flattenFields(collection.fields ?? [])
          .filter((field) => getFieldValueType(field) === 'number')
          .map((field) => field.name),
      ])}`,
    )
  }
  content.push('  }', '  export interface PostBooleanField {')
  for (const collection of Object.values(collectionsConfig)) {
    content.push(
      `    '${collection.name}': ${toStringLiterals([
        ...Object.entries(standardCollectionColumns)
          .filter(([_, type]) => type === 'boolean')
          .map(([field]) => field),
        ...flattenFields(collection.fields ?? [])
          .filter((field) => getFieldValueType(field) === 'boolean')
          .map((field) => field.name),
      ])}`,
    )
  }
  content.push('  }')

  /*
  |
  | Roles
  |
  */

  content.push('  export interface Role {')

  for (const field of standardRoleFields) {
    if (field.name === 'capabilities') {
      content.push(`    ${field.name}: (${toStringLiterals(listCapabilities())})[]`)
    } else {
      content.push(createComment(field, '    '))
      content.push(`    ${field.name}: ${getFieldType(field, '    ')}`)
    }
  }

  content.push(
    createComment(null, '    ', [
      'A list of all users assigned to this role.',
      '',
      'Note: This is a computed field and cannot be queried.',
    ]),
    '    users: {',
    "      id: User['id']",
    "      email: User['email']",
    '    }[]',
  )

  content.push('  }', '  export interface RoleInput {')

  for (const field of standardRoleFields) {
    if (field.name === 'capabilities') {
      content.push(`    ${field.name}: (${toStringLiterals(listCapabilities())})[]`)
    } else {
      content.push(createComment(field, '    '))
      content.push(`    ${field.name}: ${getFieldInputType(field, '    ')}`)
    }
  }

  content.push(
    '  }',
    `  export type StandardRoleField = ${toStringLiterals(
      standardRoleFields.map((field) => field.name),
    )}`,
    '  export type CustomRoleField = never',
    "  export type ComputedRoleField = 'users'",
    `  export type CreatableRoleField = ${toStringLiterals(creatableStandardRoleColumns)}`,
    `  export type SelectableRoleField = ${toStringLiterals(
      standardRoleFields.map((field) => field.name),
    )}`,
    `  export type SortableRoleField = ${toStringLiterals(
      standardRoleFields.filter((field) => isSortableField(field)).map((field) => field.name),
    )}`,
    `  export type FilterableRoleField = ${toStringLiterals(
      standardRoleFields.filter((field) => isFilterableField(field)).map((field) => field.name),
    )}`,
    `  export type UpdateableRoleField = ${toStringLiterals(updateableStandardRoleColumns)}`,
    `  export type RequiredRoleField = ${toStringLiterals(
      standardRoleFields.filter(isRequired).map((field) => field.name),
    )}`,
    `  export type RoleStringField = ${toStringLiterals(
      Object.entries(standardRoleColumns)
        .filter(([_, type]) => type === 'string')
        .map(([field]) => field),
    )}`,
    `  export type RoleNumberField = ${toStringLiterals(
      Object.entries(standardRoleColumns)
        .filter(([_, type]) => type === 'number' || type === 'dateTime')
        .map(([field]) => field),
    )}`,
    `  export type RoleBooleanField = ${toStringLiterals(
      Object.entries(standardRoleColumns)
        .filter(([_, type]) => type === 'boolean')
        .map(([field]) => field),
    )}`,
  )

  /*
  |
  | Users
  |
  */

  const customUserFields: QueryableField[] = flattenFields(userConfig.fields ?? [])

  content.push('  export interface User {')

  for (const field of standardUserFields) {
    if (field.name === 'capabilities') {
      content.push(`    ${field.name}: (${toStringLiterals(listCapabilities())})[]`)
    } else {
      content.push(createComment(field, '    '))
      content.push(`    ${field.name}: ${getFieldType(field, '    ')}`)
    }
  }

  content.push(
    createComment(null, '    ', [
      'A merged list of capabilities from both the user and the role assigned to them.',
      '',
      'Note: This is a computed field and cannot be queried.',
    ]),
    `    combinedCapabilities: (${toStringLiterals(listCapabilities())})[]`,
  )

  for (const field of customUserFields) {
    content.push(createComment(field, '    '))
    content.push(`    ${field.name}: ${getFieldType(field, '    ')}`)
  }

  content.push('  }', '  export interface UserInput {')

  for (const field of standardUserFields) {
    if (field.name === 'capabilities') {
      content.push(`    ${field.name}: (${toStringLiterals(listCapabilities())})[]`)
    } else {
      content.push(createComment(field, '    '))
      content.push(`    ${field.name}: ${getFieldInputType(field, '    ')}`)
    }
  }

  for (const field of customUserFields) {
    content.push(createComment(field, '    '))
    content.push(`    ${field.name}: ${getFieldInputType(field, '    ')}`)
  }

  content.push(
    createComment(null, '    ', ['The user password.']),
    '    password: string',
    '  }',
    `  export type StandardUserField = ${toStringLiterals(
      standardUserFields.map((field) => field.name),
    )}`,
    `  export type CustomUserField = ${toStringLiterals(
      customUserFields.map((field) => field.name),
    )}`,
    "  export type ComputedUserField = 'combinedCapabilities'",
    `  export type CreatableUserField = ${toStringLiterals([
      ...creatableStandardUserColumns,
      ...customUserFields.map((field) => field.name),
    ])}`,
    `  export type SelectableUserField = ${toStringLiterals([
      ...standardUserFields.map((field) => field.name),
      ...customUserFields.filter((field) => field.selectable !== false).map((field) => field.name),
    ])}`,
    `  export type SortableUserField = ${toStringLiterals([
      ...standardUserFields.filter((field) => isSortableField(field)).map((field) => field.name),
      ...customUserFields.filter((field) => isSortableField(field)).map((field) => field.name),
    ])}`,
    `  export type FilterableUserField = ${toStringLiterals([
      ...standardUserFields.filter((field) => isFilterableField(field)).map((field) => field.name),
      ...customUserFields.filter((field) => isFilterableField(field)).map((field) => field.name),
    ])}`,
    `  export type UpdateableUserField = ${toStringLiterals([
      ...updateableStandardUserColumns,
      ...customUserFields.filter((field) => !field.readonly).map((field) => field.name),
    ])}`,
    `  export type RequiredUserField = ${toStringLiterals([
      ...standardUserFields.filter(isRequired).map((field) => field.name),
      ...customUserFields.filter(isRequired).map((field) => field.name),
      'password',
    ])}`,
    `  export type UserStringField = ${toStringLiterals([
      ...Object.entries(standardUserColumns)
        .filter(([_, type]) => type === 'string')
        .map(([field]) => field),
      ...customUserFields
        .filter((field) => getFieldValueType(field) === 'string')
        .map((field) => field.name),
    ])}`,
    `  export type UserNumberField = ${toStringLiterals([
      ...Object.entries(standardUserColumns)
        .filter(([_, type]) => type === 'number' || type === 'dateTime')
        .map(([field]) => field),
      ...customUserFields
        .filter((field) => getFieldValueType(field) === 'number')
        .map((field) => field.name),
    ])}`,
    `  export type UserBooleanField = ${toStringLiterals([
      ...Object.entries(standardUserColumns)
        .filter(([_, type]) => type === 'boolean')
        .map(([field]) => field),
      ...customUserFields
        .filter((field) => getFieldValueType(field) === 'boolean')
        .map((field) => field.name),
    ])}`,
  )

  /*
  |
  | Settings
  |
  */

  content.push('  export interface Settings {')

  for (const setting of settingConfigs) {
    content.push(
      `    '${setting.group}': {`,
      `      group: '${setting.group}'`,
      `      language: ${setting.translatable ? languages : `'${config.defaultLanguage}'`}`,
      '      fields: {',
    )

    for (const field of flattenFields(setting.fields)) {
      content.push(createComment(field, '        '))
      content.push(`        ${field.name}: ${getFieldType(field, '        ')}`)
    }

    content.push('      }')
    content.push('    }')
  }

  content.push('  }', '  export interface SettingsInput {')

  for (const setting of settingConfigs) {
    content.push(`    '${setting.group}': {`)

    for (const field of flattenFields(setting.fields)) {
      content.push(createComment(field, '      '))
      content.push(`      ${field.name}: ${getFieldInputType(field, '      ')}`)
    }

    content.push('    }')
  }

  content.push('  }')

  content.push('}')
  content.push('')

  fs.writeFileSync(`${typesDir}/index.d.ts`, content.join('\n'))
}

function getFieldType(field: Field, indent: string, orNull: string = ' | null'): string {
  if (field.type === 'buttons' || field.type === 'select') {
    return toStringLiterals(field.choices?.map((choice) => choice.value)) + orNull
  } else if (field.type === 'checkbox' || field.type === 'switch') {
    return 'boolean'
  } else if (field.type === 'checkboxes') {
    return '(' + toStringLiterals(field.choices?.map((choice) => choice.value)) + ')[]'
  } else if (field.type === 'date' || field.type === 'dateTime' || field.type === 'time') {
    return `string${orNull}`
  } else if (field.type === 'file') {
    return toRelationFields('Upload', field.returnFields ?? ['id', 'url'], indent)
  } else if (field.type === 'icon') {
    return (
      (field.returnFormat === 'name' ? toStringLiterals(Object.keys(icons)) : 'string') + orNull
    )
  } else if (field.type === 'image') {
    return `Image${orNull}`
  } else if (field.type === 'link') {
    return `Link${orNull}`
  } else if (field.type === 'number' || field.type === 'slider') {
    return 'number'
  } else if (field.type === 'page') {
    return toRelationFields('Page', field.returnFields ?? ['id', 'title', 'path'], indent)
  } else if (field.type === 'post') {
    return toRelationFields(`Post['${field.collection}']`, field.returnFields ?? ['id'], indent)
  } else if (field.type === 'preset') {
    return toRelationFields('Preset', field.returnFields ?? ['id', 'blocks'], indent)
  } else if (field.type === 'repeater') {
    let type: string = '{\n'

    for (const subField of flattenFields(field.subFields)) {
      type += `${indent}  ${subField.name}: ${getFieldType(subField, indent + '  ')}\n`
    }

    return `${type}${indent}}[]`
  } else if (field.type === 'role') {
    return toRelationFields('Role', field.returnFields ?? ['id', 'name', 'capabilities'], indent)
  } else if (field.type === 'size') {
    return 'Size'
  } else if (field.type === 'user') {
    return toRelationFields('User', field.returnFields ?? ['id', 'email'], indent)
  } else {
    return 'string'
  }
}

function getFieldInputType(field: Field, indent: string): string {
  if (field.type === 'date' || field.type === 'dateTime' || field.type === 'time') {
    return 'string | number' + (field.required ? '' : ' | null')
  } else if (
    field.type === 'file' ||
    field.type === 'image' ||
    field.type === 'page' ||
    field.type === 'post' ||
    field.type === 'preset' ||
    field.type === 'role' ||
    field.type === 'user'
  ) {
    return 'number' + (field.required ? '' : ' | null')
  } else if (field.type === 'icon') {
    return toStringLiterals(Object.keys(icons)) + (field.required ? '' : ' | null')
  } else if (field.type === 'repeater') {
    let type: string = '{\n'

    for (const subField of flattenFields(field.subFields)) {
      type += `${indent}  ${subField.name}: ${getFieldInputType(subField, indent + '  ')}\n`
    }

    return `${type}${indent}}[]`
  } else {
    return getFieldType(field, indent, field.required ? '' : ' | null')
  }
}

function toStringLiterals(values?: string[]): string {
  return values?.map((value) => `'${value}'`).join(' | ') || 'never'
}

function toRelationFields(prefix: string, fieldNames: string[], indent: string): string {
  const content: string[] = ['{']

  for (const fieldName of fieldNames) {
    content.push(`${indent}  ${fieldName}: ${prefix}['${fieldName}']`)
  }

  content.push(`${indent}} | null`)

  return content.join('\n')
}

function createComment(field: Field | null, indent: string, comment?: string[]): string {
  const content: string[] = [`${indent}/**`]

  if (comment?.length) {
    for (const line of comment) {
      content.push(`${indent} * ${line}`)
    }
  } else if (field?.description) {
    content.push(`${indent} * ${field.description}`)
  }

  if (field) {
    if (content.length > 1) {
      content.push(`${indent} *`)
    }

    content.push(`${indent} * Field:`)
    content.push(`${indent} * \`\`\`js`)

    for (const line of JSON.stringify(field, undefined, 2).split('\n')) {
      content.push(
        `${indent} * ${line
          .replace(/"([a-z0-9]+)":/i, '$1:')
          .replace(/"([^'"]*)"(,?)$/gi, "'$1'$2")}`,
      )
    }

    content.push(`${indent} * \`\`\``)
  }

  content.push(`${indent} */`)

  return content.join('\n')
}

function isRequired(field: Field): boolean {
  return (
    !!field.required &&
    field.type !== 'number' &&
    field.type !== 'size' &&
    field.type !== 'slider' &&
    (Array.isArray((field as any).default)
      ? (field as any).default.length === 0
      : !(field as any).default)
  )
}
