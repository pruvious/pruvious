import {
  Block,
  Collection,
  ColumnRecords,
  Field,
  FieldGroup,
  flattenFields,
  QueryableField,
  QueryableModel,
  reservedCollectionColumns,
  reservedPageColumns,
  reservedPresetColumns,
  reservedRoleColumns,
  reservedUploadColumns,
  reservedUserColumns,
  Settings,
  simpleWalkFields,
  standardCollectionFields,
  standardPageFields,
  standardPresetFields,
  standardRoleFields,
  standardUploadFields,
  standardUserFields,
  Validator,
} from '@pruvious-test/shared'
import { camelize, slugify, uppercaseFirstLetter } from '@pruvious-test/utils'
import { Action } from 'App/Controllers/Http/ActionsController'
import {
  blocks,
  collectionsConfig,
  config,
  icons,
  pageConfig,
  presetConfig,
  roleConfig,
  settingConfigs,
  uploadConfig,
  userConfig,
} from 'App/imports'
import fs from 'fs'
import path from 'path'
import { pruvDir } from './helpers'

export async function importFile(relativeBasePath: string) {
  const resolvedPaths = [
    path.resolve(pruvDir(), '.output', relativeBasePath),
    path.resolve(pruvDir(), relativeBasePath),
  ]

  let importPath: string | null = null

  for (let i = 0; i <= 1; i++) {
    importPath = fs.existsSync(`${resolvedPaths[i]}.js`)
      ? `${resolvedPaths[i]}.js`
      : fs.existsSync(`${resolvedPaths[i]}.cjs`)
      ? `${resolvedPaths[i]}.cjs`
      : null

    if (importPath) {
      break
    }
  }

  if (importPath) {
    return (await import(importPath)).default
  }

  return null
}

export async function importFiles(relativeDir: string, exclude: string[] = []) {
  const resolvedDirs = [
    path.resolve(pruvDir(), '.output', relativeDir),
    path.resolve(pruvDir(), relativeDir),
  ]
  const defaults: any[] = []

  for (let i = 0; i <= 1; i++) {
    if (fs.existsSync(resolvedDirs[i])) {
      for (const file of fs.readdirSync(resolvedDirs[i])) {
        if (
          exclude.every((excluded) => {
            return (
              `${excluded.toLowerCase()}.js` !== file.toLowerCase() &&
              `${excluded.toLowerCase()}.cjs` !== file.toLowerCase()
            )
          }) &&
          (file.endsWith('.js') || file.endsWith('.cjs'))
        ) {
          defaults.push((await import(`${resolvedDirs[i]}/${file}`)).default)
        }
      }

      break
    }
  }

  return defaults
}

export async function importIcons() {
  const resolvedDir = path.resolve(pruvDir(), 'icons')

  if (fs.existsSync('icons')) {
    for (const file of fs.readdirSync(resolvedDir)) {
      if (file.endsWith('.svg')) {
        const name = slugify(file.replace('.svg', ''))
        icons[name] = fs.readFileSync(`${resolvedDir}/${file}`, 'utf-8')
      }
    }
  }
}

export function validateConfig() {
  if (!config.languages?.length) {
    throw new Error('There must be at least one language defined in pruvious.config.ts')
  }

  if (config.languages.every((language) => language.code !== config.defaultLanguage)) {
    throw new Error("Invalid 'defaultLanguage' code in pruvious.config.ts")
  }

  if (config.fieldStubs) {
    for (const stubName of Object.keys(config.fieldStubs)) {
      if (camelize(stubName) !== stubName) {
        throw new Error(
          `Field stubs must be camel-cased (config.fieldStubs.${stubName}). Suggestion: '${camelize(
            stubName,
          )}'`,
        )
      }
    }
  }

  if (config.jobs) {
    for (const job of config.jobs) {
      if (['flush', 'flushPublic', 'rebuildSitemap'].includes(job.name)) {
        throw new Error(`The job name '${job.name}' is reserved (config.jobs.${job.name}).`)
      } else if (camelize(job.name) !== job.name) {
        throw new Error(
          `Job names must be camel-cased (config.jobs.${job.name}). Suggestion: '${camelize(
            job.name,
          )}'`,
        )
      }
    }
  }
}

export function validatePageConfig() {
  validateModelConfig(standardPageFields, pageConfig, reservedPageColumns, 'config.pages')
}

export function validatePresetConfig() {
  validateModelConfig(standardPresetFields, presetConfig, reservedPresetColumns, 'config.presets')
}

export function validateUploadConfig() {
  validateModelConfig(standardUploadFields, uploadConfig, reservedUploadColumns, 'config.uploads')
}

export function validateRoleConfig() {
  validateModelConfig(standardRoleFields, roleConfig, reservedRoleColumns, 'config.roles')
}

export function validateUserConfig() {
  validateModelConfig(standardUserFields, userConfig, reservedUserColumns, 'config.users')
}

export function validateCollectionConfig(config: Collection) {
  if (!config.name) {
    throw new Error("The 'name' parameter must be specified for all collections")
  } else if (slugify(config.name) !== config.name) {
    throw new Error(
      `The 'name' parameter must be a lowercase slug. Suggestion: '${slugify(config.name)}'`,
    )
  } else if (collectionsConfig[config.name]) {
    throw new Error(`Duplicate collection name: '${config.name}'`)
  }

  validateModelConfig(
    standardCollectionFields,
    config,
    reservedCollectionColumns,
    `collections.${config.name}`,
  )
}

export function validateSettingConfig(config: Settings) {
  if (!config.group) {
    throw new Error("The 'group' parameter must be specified for all settings")
  } else if (['seo'].includes(config.group)) {
    throw new Error(`The settings group '${config.group}' is reserved)`)
  } else if (slugify(config.group) !== config.group) {
    throw new Error(
      `The 'group' parameter must be a lowercase slug. Suggestion: '${slugify(config.group)}'`,
    )
  } else if (!config.fields) {
    throw new Error(
      `The 'fields' parameter must be specified for all settings (settings.${config.group})`,
    )
  } else if (settingConfigs.some((_config) => _config.group === config.group)) {
    throw new Error(`Duplicate settings group: '${config.group}'`)
  }

  validateModelConfig([], config, {}, `settings.${config.group}`)
}

export function validateBlock(block: Block) {
  if (block.name === 'Preset') {
    throw new Error(`The block name 'Preset' is reserved)`)
  } else if (!/^([A-Z][a-z0-9]*)+$/.test(block.name)) {
    throw new Error(
      `The block name '${block.name}' must be pascal-cased. Suggestion: '${uppercaseFirstLetter(
        camelize(block.name),
      )}'`,
    )
  } else if (blocks.some((_block) => _block.name === block.name)) {
    throw new Error(`Duplicate block name: '${block.name}'`)
  }

  if (block.slots) {
    for (const slotName of Object.keys(block.slots)) {
      if (!/^([a-z][A-Z0-9]*)+$/.test(slotName)) {
        throw new Error(
          `The slot name '${slotName}' must be camel-cased (blocks.${
            block.name
          }). Suggestion: '${camelize(slotName)}'`,
        )
      }
    }
  }
}

export function validateActionConfig(config: Action) {
  if (!config.name) {
    throw new Error("The 'name' parameter must be specified for all actions")
  } else if (slugify(config.name) !== config.name) {
    throw new Error(
      `The 'name' parameter must be a lowercase slug. Suggestion: '${slugify(config.name)}'`,
    )
  }
}

export function validateValidatorConfig(config: Validator) {
  if (!config.name) {
    throw new Error("The 'name' parameter must be specified for all validators")
  } else if (camelize(config.name) !== config.name) {
    throw new Error(
      `The 'name' parameter must be camel-cased. Suggestion: '${camelize(config.name)}'`,
    )
  }
}

export function validateModelConfig(
  standardFields: QueryableField[],
  config: QueryableModel & { fields?: (QueryableField | FieldGroup)[] },
  reservedColumns: ColumnRecords,
  locationPrefix: string,
) {
  const fields = [...standardFields]
  const camelRegex = /^[a-z][a-zA-Z0-9]*$/

  if (config.fields) {
    const forbidden = [...Object.keys(reservedColumns).map((column) => column.toLowerCase())]
    flattenFields(config.fields).forEach((field) => {
      if (forbidden.includes(field.name.toLowerCase())) {
        throw new Error(`The field name '${field.name}' is reserved (${locationPrefix}.fields)`)
      } else if (!camelRegex.test(field.name)) {
        throw new Error(
          `The field name '${
            field.name
          }' must be camel-cased (${locationPrefix}.fields). Suggestion: '${camelize(field.name)}'`,
        )
      }
    })

    fields.push(...flattenFields(config.fields))
  }

  if (config.search) {
    config.search.forEach((item) => {
      const fieldName = item.split(':')[0]

      if (fields.every((field) => field.name !== fieldName)) {
        throw new Error(`The field '${fieldName}' does not exist (${locationPrefix}.search)`)
      }
    })
  }

  if (config.listing) {
    config.listing.fields?.forEach((item) => {
      const fieldName = item.split(':')[0]

      if (fields.every((field) => field.name !== fieldName)) {
        throw new Error(
          `The field '${fieldName}' does not exist (${locationPrefix}.listing.fields)`,
        )
      }
    })

    config.listing.sort?.forEach((item) => {
      if (fields.every((field) => field.name !== item.field)) {
        throw new Error(`The field '${item.field}' does not exist (${locationPrefix}.listing.sort)`)
      }
    })
  }
}

export function validateCustomFields() {
  const allFields: { field: Field; location: string }[] = []

  allFields.push(
    ...flattenFields(standardPageFields).map((field) => ({
      field,
      location: 'config.pages.fields',
    })),
  )

  if (pageConfig.fields) {
    allFields.push(
      ...flattenFields(pageConfig.fields).map((field) => ({
        field,
        location: 'config.pages.fields',
      })),
    )
  }

  allFields.push(
    ...flattenFields(standardUploadFields).map((field) => ({
      field,
      location: 'config.uploads.fields',
    })),
  )

  if (uploadConfig.fields) {
    allFields.push(
      ...flattenFields(uploadConfig.fields).map((field) => ({
        field,
        location: 'config.uploads.fields',
      })),
    )
  }

  allFields.push(
    ...flattenFields(standardRoleFields).map((field) => ({
      field,
      location: 'config.roles.fields',
    })),
  )

  allFields.push(
    ...flattenFields(standardUserFields).map((field) => ({
      field,
      location: 'config.users.fields',
    })),
  )

  if (userConfig.fields) {
    allFields.push(
      ...flattenFields(userConfig.fields).map((field) => ({
        field,
        location: 'config.users.fields',
      })),
    )
  }

  blocks.forEach((block) => {
    allFields.push(
      ...flattenFields(block.fields).map((field) => ({
        field,
        location: `blocks.${block.name}`,
      })),
    )
  })

  Object.values(collectionsConfig).forEach((collectionConfig) => {
    if (collectionConfig.fields) {
      allFields.push(
        ...flattenFields(collectionConfig.fields).map((field) => ({
          field,
          location: `collections.${collectionConfig.name}.fields`,
        })),
      )
    }
  })

  settingConfigs.forEach((settingConfig) => {
    allFields.push(
      ...flattenFields(settingConfig.fields).map((field) => ({
        field,
        location: `settings.${settingConfig.group}.fields`,
      })),
    )
  })

  // Validate field relations

  for (const $field of allFields) {
    for (const { field, key } of simpleWalkFields([$field.field])) {
      //
      // Relational fields
      //
      if (field.type === 'role') {
        const lookIn = `config.${field.type}s.fields`

        if (field.choiceLabel) {
          if (
            typeof field.choiceLabel === 'string' &&
            !hasField(allFields, field.choiceLabel, lookIn)
          ) {
            throw new Error(
              `The field name '${field.choiceLabel}' does not exist (${$field.location}.${key}.choiceLabel)`,
            )
          } else if (
            Array.isArray(field.choiceLabel) &&
            !hasField(allFields, field.choiceLabel[0], lookIn)
          ) {
            throw new Error(
              `The field name '${field.choiceLabel[0]}' does not exist (${$field.location}.${key}.choiceLabel)`,
            )
          } else if (
            Array.isArray(field.choiceLabel) &&
            !hasField(allFields, field.choiceLabel[1], lookIn)
          ) {
            throw new Error(
              `The field name '${field.choiceLabel[1]}' does not exist (${$field.location}.${key}.choiceLabel)`,
            )
          }
        }

        if (field.listingLabel && !hasField(allFields, field.listingLabel, lookIn)) {
          throw new Error(
            `The field name '${field.listingLabel}' does not exist (${$field.location}.${key}.listingLabel)`,
          )
        }

        field.previewFields?.forEach((fieldName) => {
          if (!hasField(allFields, fieldName, lookIn)) {
            throw new Error(
              `The field name '${fieldName}' does not exist (${$field.location}.${key}.previewFields)`,
            )
          }
        })

        field.returnFields?.forEach((fieldName) => {
          if (!hasField(allFields, fieldName, lookIn)) {
            throw new Error(
              `The field name '${fieldName}' does not exist (${$field.location}.${key}.returnFields)`,
            )
          }
        })
      }
    }
  }
}

function hasField(
  fields: { field: Field; location: string }[],
  fieldName: string,
  location: string,
): boolean {
  return fields.some((item) => item.location === location && item.field.name === fieldName)
}

export function applyFieldStubs(fields?: (Field | FieldGroup)[]) {
  for (const { field } of simpleWalkFields(fields ?? [])) {
    if (field.extend) {
      for (const stubName of typeof field.extend === 'string' ? [field.extend] : field.extend) {
        const stub = config.fieldStubs ? config.fieldStubs[stubName] : null

        if (stub) {
          for (const [key, value] of Object.entries(stub)) {
            if (field[key] === undefined) {
              field[key] = value
            }
          }
        } else {
          throw new Error(`The field stub '${stubName}' does not exist`)
        }
      }
    }
  }
}

let _imported: boolean = false

export function onImport() {
  _imported = true
}

export function isImported() {
  return _imported
}
