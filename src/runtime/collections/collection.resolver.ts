import type { CollectionField } from '#pruvious'
import fs from 'fs-extra'
import { resolve } from 'path'
import { evaluateModule } from '../instances/evaluator'
import { queueError } from '../instances/logger'
import { resolveAppPath, resolveModulePath } from '../instances/path'
import { getModuleOption } from '../instances/state'
import { uniqueArray } from '../utils/array'
import { isUndefined } from '../utils/common'
import { walkDir } from '../utils/fs'
import { isKeyOf, isObject, walkObject } from '../utils/object'
import { camelCase, isString, snakeCase } from '../utils/string'
import { validateDefaultExport, validateSafeSlug } from '../utils/validation'
import type { ResolvedCollectionDefinition } from './collection.definition'

export interface ResolvedCollection {
  definition: ResolvedCollectionDefinition
  source: string
  isStandard: boolean
}

// <filePath, exports>
const cachedCollections: Record<string, any> = {}

export function resolveCollections(): { records: Record<string, ResolvedCollection>; errors: number } {
  const records: Record<string, ResolvedCollection> = {}
  const fromModule = resolveModulePath('./runtime/collections/standard')
  const fromApp = resolveAppPath('./collections')
  const registeredStandardCollections: Record<string, boolean> = getModuleOption('standardCollections')

  let errors = 0

  for (const { fullPath, file } of walkDir(fromModule, { endsWith: ['.js', '.ts'], endsWithout: '.d.ts' })) {
    if (registeredStandardCollections[file.split('.')[0]]) {
      errors += resolveCollection(fullPath, records, true)
    }
  }

  if (fs.existsSync(fromApp) && fs.lstatSync(fromApp).isDirectory()) {
    for (const { fullPath } of walkDir(fromApp, { endsWith: '.ts', endsWithout: '.d.ts' })) {
      errors += resolveCollection(fullPath, records, false)
    }
  }

  for (const layer of getModuleOption('layers').slice(1)) {
    if (fs.existsSync(resolve(layer, 'collections'))) {
      for (const { fullPath } of walkDir(resolve(layer, 'collections'), {
        endsWith: ['.ts'],
        endsWithout: '.d.ts',
      })) {
        errors += resolveCollection(fullPath, records, false, true)
      }
    }
  }

  return { records, errors }
}

function resolveCollection(
  filePath: string,
  records: Record<string, ResolvedCollection>,
  isStandard: boolean,
  ignoreDuplicate = false,
): 0 | 1 {
  try {
    let exports = cachedCollections[filePath]

    if (isUndefined(exports)) {
      let code = fs.readFileSync(filePath, 'utf-8')
      const hasLocalImports = /^\s*import.+['""](?:\.|~~|~|@@|@)/m.test(code)

      if (!isStandard && !/^\s*import.+defineCollection.+pruvious/m.test(code)) {
        code += "import { defineCollection } from '#pruvious'\n"
      }

      exports = evaluateModule(filePath, code)

      if (isStandard || !hasLocalImports) {
        cachedCollections[filePath] = exports
      }
    }

    if (
      validateDefaultExport('collections', 'defineCollection({ ... })', exports, filePath) &&
      validateSafeSlug({
        subject: 'collection',
        prop: 'name',
        value: exports.default.name,
        path: filePath,
        examples: ["'products'", "'news'", "'form-entries'", 'etc.'],
      })
    ) {
      if (records[exports.default.name]) {
        if (ignoreDuplicate) {
          return 0
        } else {
          queueError(`Cannot register duplicate collection name $c{{ ${exports.default.name} }} in $c{{ ${filePath} }}`)
        }
      } else if (Object.keys(exports.default.fields).some((fieldName) => fieldName.startsWith('_'))) {
        queueError(`Cannot declare field names beginning with an underscore in $c{{ ${filePath} }}`)
      } else if (snakeCase(exports.default.name) === getModuleOption('singleCollectionsTable')) {
        queueError(`The table name $c{{ ${snakeCase(exports.default.name)} }} is reserved for single collections`)
      } else if (snakeCase(exports.default.name).length > 63) {
        queueError(
          `The collection name $c{{ ${
            exports.default.name
          } }} must not exceed 63 characters when converted to snake case ($c{{ ${snakeCase(
            exports.default.name,
          )} }}) in $c{{ ${filePath} }}`,
        )
      } else if (exports.default.search && !exports.default.search.default) {
        queueError(`Missing $c{{ default }} search structure key in $c{{ ${filePath} }}`)
      } else {
        for (const { key, value, parent } of walkObject(exports.default.fields)) {
          if (isObject(value) && isKeyOf(value, 'type') && isKeyOf(value, 'options')) {
            if (!isString(key)) {
              queueError(`The field name $c{{ ${key.toString()} }} must be a string in $c{{ ${filePath} }}`)
              return 1
            } else if (!key.match(/[a-z]/i)) {
              queueError(`The field name $c{{ ${key} }} must include at least one letter in $c{{ ${filePath} }}`)
              return 1
            } else if (camelCase(key) !== key) {
              queueError(
                `The field name $c{{ ${key} }} must be written in camel case (e.g., $c{{ ${camelCase(
                  key,
                )} }}) in $c{{ ${filePath} }}`,
              )
              return 1
            } else if (parent === exports.default.fields) {
              if (snakeCase(key).length > 59) {
                queueError(
                  `The field name $c{{ ${key} }} must not exceed 59 characters when converted to snake case ($c{{ ${snakeCase(
                    key,
                  )} }}) in $c{{ ${filePath} }}`,
                )
                return 1
              } else if (
                (value as CollectionField).additional?.index &&
                `ix_${snakeCase(exports.default.name)}_${snakeCase(key)}}`.length > 63
              ) {
                queueError(
                  `The generated index name $c{{ ix_${snakeCase(exports.default.name)}_${snakeCase(
                    key,
                  )}} }} must not exceed 63 characters in $c{{ ${filePath} }}`,
                )
                return 1
              } else if (
                (value as CollectionField).additional?.unique &&
                `ux_${snakeCase(exports.default.name)}_${snakeCase(key)}}`.length > 63
              ) {
                queueError(
                  `The generated index name $c{{ ux_${snakeCase(exports.default.name)}_${snakeCase(
                    key,
                  )}} }} must not exceed 63 characters in $c{{ ${filePath} }}`,
                )
                return 1
              } else if (
                (exports.default as ResolvedCollectionDefinition).compositeIndexes?.some((indexes) => {
                  const indexName = `cx_${snakeCase(exports.default.name)}_${indexes.map(snakeCase).join('_')}`

                  if (indexName.length > 63) {
                    queueError(
                      `The generated index name $c{{ ${indexName} }} must not exceed 63 characters in $c{{ ${filePath} }}`,
                    )
                    return true
                  }

                  return false
                })
              ) {
                return 1
              } else if (
                (exports.default as ResolvedCollectionDefinition).uniqueCompositeIndexes?.some((indexes) => {
                  const indexName = `uc_${snakeCase(exports.default.name)}_${indexes.map(snakeCase).join('_')}`

                  if (indexName.length > 63) {
                    queueError(
                      `The generated index name $c{{ ${indexName} }} must not exceed 63 characters in $c{{ ${filePath} }}`,
                    )
                    return true
                  }

                  return false
                })
              ) {
                return 1
              } else if (
                (exports.default as ResolvedCollectionDefinition).search &&
                Object.keys(exports.default.search).some((structure) => {
                  const columnName = `_search_${snakeCase(structure)}`
                  const indexName = `ix_${snakeCase(exports.default.name)}_${columnName}`

                  if (columnName.length > 59) {
                    queueError(
                      `The generated column name $c{{ ${indexName} }} must not exceed 59 characters in $c{{ ${filePath} }}`,
                    )
                    return true
                  } else if (indexName.length > 63) {
                    queueError(
                      `The generated index name $c{{ ${indexName} }} must not exceed 63 characters in $c{{ ${filePath} }}`,
                    )
                    return true
                  }

                  return false
                })
              ) {
                return 1
              }
            }
          }
        }

        records[exports.default.name] = { definition: exports.default, source: filePath, isStandard }
        return 0
      }
    }
  } catch (e) {
    queueError(`Cannot define collection in $c{{ ${filePath} }}\n\nDetails:`, e)
  }

  return 1
}

export function clearCachedCollection(path: string) {
  delete cachedCollections[path]
}

export function getStandardCollectionNames(): string[] {
  return uniqueArray(
    fs.readdirSync(resolveModulePath('./runtime/collections/standard')).map((file) => file.split('.')[0]),
  )
}
