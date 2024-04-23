import {
  dbToJsType,
  resolveFieldPopulation,
  type ResolvedFieldDefinition,
  type ResolvedFieldPopulation,
} from '../fields/field.definition'
import type { ResolvedField } from '../fields/field.resolver'
import { resolveAppPath, resolveLayerPath, resolveModulePath } from '../instances/path'
import { getModuleOption } from '../instances/state'
import { isArray, toArray } from '../utils/array'
import { CodeGenerator } from '../utils/code-generator'
import { relativeDotPruviousImport, relativeImport, write } from '../utils/fs'
import { isObject } from '../utils/object'
import { camelCase, isString, kebabCase, pascalCase } from '../utils/string'
import { unifyLiteralStrings } from '../utils/typescript'
import type { FieldLayout } from './collection.definition'
import { getStandardCollectionNames, type ResolvedCollection } from './collection.resolver'
import { resolveCollectionFieldOptions } from './field-options.resolver'

export function generateCollections(
  collections: Record<string, ResolvedCollection>,
  fields: Record<string, ResolvedField>,
  ts: CodeGenerator,
  tsServer: CodeGenerator,
  tsStandard: CodeGenerator,
  tsDashboard: CodeGenerator,
) {
  const collectionsArray = Object.values(collections)
  const dotPruviousPath = resolveAppPath('./.pruvious')
  const standardCollections = getStandardCollectionNames()
  const tsCollections = new CodeGenerator()
  const fieldsMap = Object.fromEntries(Object.entries(fields).map(([name, { definition }]) => [name, definition]))

  /*
  |--------------------------------------------------------------------------
  | Collection names
  |--------------------------------------------------------------------------
  |
  */
  const multiCollectionNames = collectionsArray
    .filter(({ definition }) => definition.mode === 'multi')
    .map(({ definition }) => definition.name)
  const singleCollectionNames = collectionsArray
    .filter(({ definition }: any) => definition.mode === 'single')
    .map(({ definition }) => definition.name)

  ts.newDecl(`export type CollectionName = ${unifyLiteralStrings(...Object.keys(collections))}`)
  ts.newLine(
    `export const collectionNames = [${Object.keys(collections)
      .map((c) => `'${c}'`)
      .join(', ')}]`,
  )

  ts.newDecl(`export type StandardCollectionName = ${unifyLiteralStrings(...standardCollections)}`)
  ts.newLine(`export const standardCollectionNames = [${standardCollections.map((c) => `'${c}'`).join(', ')}]`)

  ts.newDecl(`export type MultiCollectionName = ${unifyLiteralStrings(...multiCollectionNames)}`)
  ts.newLine(`export const multiCollectionNames = [${multiCollectionNames.map((c) => `'${c}'`).join(', ')}]`)

  ts.newDecl(`export type SingleCollectionName = ${unifyLiteralStrings(...singleCollectionNames)}`)
  ts.newLine(`export const singleCollectionNames = [${singleCollectionNames.map((c) => `'${c}'`).join(', ')}]`)

  ts.newDecl(`export type UploadsCollectionName = ${getModuleOption('uploads') ? "'uploads'" : 'never'}`)
  ts.newLine(`export const uploadsCollectionName = ${getModuleOption('uploads') ? "'uploads'" : 'null'}`)

  ts.newDecl(
    `export type TranslatableCollectionName = ${unifyLiteralStrings(
      ...collectionsArray.filter(({ definition }) => definition.translatable).map(({ definition }) => definition.name),
    )}`,
  )

  ts.newDecl(
    `export type SearchableCollectionName = ${unifyLiteralStrings(
      ...collectionsArray.filter(({ definition }) => definition.search).map(({ definition }) => definition.name),
    )}`,
  )

  ts.newDecl(
    `export type PublicReadCollectionName = ${unifyLiteralStrings(
      ...collectionsArray
        .filter(({ definition }) => definition.apiRoutes.read === 'public')
        .map(({ definition }) => definition.name),
    )}`,
  )

  /*
  |--------------------------------------------------------------------------
  | re-export
  |--------------------------------------------------------------------------
  |
  */
  const definitionPath = resolveModulePath('./runtime/collections/collection.definition')

  ts.newDecl(
    `import type { CollectionDefinition, CollectionGuard, CollectionGuardContext, CollectionSearch, ContentBuilder, DuplicateContext, FieldLayout, MirrorTranslationContext, MultiEntryCollectionDefinition, PublicPagesOptions, ResolvedCollectionDefinition, SingleEntryCollectionDefinition } from '${relativeImport(
      dotPruviousPath,
      definitionPath,
    )}'`,
  )
    .newLine(
      'export { type CollectionDefinition, type CollectionGuard, type CollectionGuardContext, type CollectionSearch, type ContentBuilder, type DuplicateContext, type FieldLayout, type MirrorTranslationContext, type MultiEntryCollectionDefinition, type PublicPagesOptions, type ResolvedCollectionDefinition, type SingleEntryCollectionDefinition }',
    )
    .newLine(
      `import type { Image, ImageSource, OptimizedImage, OptimizedImageSource } from '${relativeImport(
        dotPruviousPath,
        resolveModulePath('./runtime/collections/images'),
      )}'`,
    )
    .newLine('export { type Image, type ImageSource, type OptimizedImage, type OptimizedImageSource }')

  for (const { definition, source } of collectionsArray) {
    const from = relativeImport(dotPruviousPath, source)
    tsCollections.newDecl(`import { default as ${camelCase(definition.name)}CollectionDefinition } from '${from}'`)
    tsCollections.newLine(`export { ${camelCase(definition.name)}CollectionDefinition }`)
  }

  tsStandard
    .newLine(
      `import { pageLikeCollection, type PageLikeCollectionOptions } from '${relativeImport(
        dotPruviousPath,
        resolveModulePath('./runtime/collections/page-like'),
      )}'`,
    )
    .newLine('export { pageLikeCollection, type PageLikeCollectionOptions }')

  ts.newLine(`import { defineCollection } from '${relativeImport(dotPruviousPath, definitionPath)}'`)
    .newLine('export { defineCollection }')
    .newLine(
      `export type { PaginateResult } from '${relativeImport(
        dotPruviousPath,
        resolveModulePath('./runtime/collections/query-builder'),
      )}'`,
    )

  tsServer
    .newDecl(`export * from './collections'`)
    .newLine(
      `export { resolveCollectionFieldOptions, resolveFieldOptions } from '${relativeImport(
        dotPruviousPath,
        resolveModulePath('./runtime/collections/field-options.resolver'),
      )}'`,
    )
    .newLine(
      `export { query, rawQuery } from '${relativeImport(
        dotPruviousPath,
        resolveModulePath('./runtime/collections/query'),
      )}'`,
    )
    .newLine(
      `export { getOptimizedImage } from '${relativeImport(
        dotPruviousPath,
        resolveModulePath('./runtime/collections/images'),
      )}'`,
    )
    .newLine(
      `export { fetchSubsetRecords } from '${relativeImport(
        dotPruviousPath,
        resolveModulePath('./runtime/collections/query-helpers'),
      )}'`,
    )
    .newLine(
      `export type { QueryStringParams, MultiQueryStringParams, SingleQueryStringParams } from '${relativeImport(
        dotPruviousPath,
        resolveModulePath('./runtime/collections/query-string'),
      )}'`,
    )
    .newLine(
      `export { defaultSingleQueryStringParams, getQueryStringParams } from '${relativeImport(
        dotPruviousPath,
        resolveModulePath('./runtime/collections/query-string'),
      )}'`,
    )
    .newLine(
      `export { readInputData, pruviousReadBody } from '${relativeImport(
        dotPruviousPath,
        resolveModulePath('./runtime/collections/input'),
      )}'`,
    )
    .newLine(`export { seo } from '${relativeImport(dotPruviousPath, resolveModulePath('./runtime/collections/seo'))}'`)

  /*
  |--------------------------------------------------------------------------
  | collections
  |--------------------------------------------------------------------------
  |
  */
  tsCollections.newDecl('export const collections = {')
  for (const { definition } of collectionsArray) {
    tsCollections.newLine(`'${definition.name}': ${camelCase(definition.name)}CollectionDefinition,`)
  }
  tsCollections.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Collection capabilities
  |--------------------------------------------------------------------------
  |
  */
  const collectionCapabilities: string[] = []
  for (const { definition } of collectionsArray) {
    for (const operation of [
      'create',
      'createMany',
      'read',
      'readMany',
      'update',
      'updateMany',
      'delete',
      'deleteMany',
    ]) {
      if (
        (definition.apiRoutes as any)[operation] &&
        (definition.mode === 'multi' || operation === 'read' || operation === 'update')
      ) {
        collectionCapabilities.push(`collection-${definition.name}-${kebabCase(operation)}`)
      }
    }
  }
  ts.newDecl(`export type CollectionCapability = ${unifyLiteralStrings(...collectionCapabilities)}`)
  ts.newDecl(
    `export const collectionCapabilities: CollectionCapability[] = [${collectionCapabilities
      .map((c) => `'${c}'`)
      .join(', ')}]`,
  )

  /*
  |--------------------------------------------------------------------------
  | Collection field name
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface CollectionFieldName {')
  for (const { definition } of collectionsArray) {
    ts.newLine(`'${definition.name}': ${unifyLiteralStrings(...Object.keys(definition.fields))}`)
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Mutable field name
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface MutableFieldName {')
  for (const { definition } of collectionsArray) {
    const mutableFields = Object.keys(definition.fields).filter((n) => !definition.fields[n].additional?.immutable)
    ts.newLine(`'${definition.name}': ${unifyLiteralStrings(...mutableFields)}`)
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Immutable field name
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface ImmutableFieldName {')
  for (const { definition } of collectionsArray) {
    const immutableFields = Object.keys(definition.fields).filter((n) => definition.fields[n].additional?.immutable)
    ts.newLine(`'${definition.name}': ${unifyLiteralStrings(...immutableFields)}`)
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Selectable field name
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface SelectableFieldName {')
  for (const { definition } of collectionsArray) {
    ts.newLine(`'${definition.name}': ${unifyLiteralStrings(...Object.keys(definition.fields))}`)
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Fetchable field name
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface FetchableFieldName {')
  for (const { definition } of collectionsArray) {
    const fieldNames = Object.entries(definition.fields)
      .filter(([_, { additional }]) => !additional || !additional.protected)
      .map(([fieldName]) => fieldName)
    ts.newLine(`'${definition.name}': ${unifyLiteralStrings(...fieldNames)}`)
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Sortable
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface Sortable {')
  for (const { definition } of collectionsArray) {
    ts.newLine(
      `'${definition.name}': ${unifyLiteralStrings(
        ...Object.keys(definition.fields),
        ...(definition.search ? Object.keys(definition.search).map((structure) => `:${structure}`) : []),
      )}`,
    )
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Serialized field type
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface SerializedFieldType {')
  for (const { definition } of collectionsArray) {
    ts.newLine(`'${definition.name}': {`)
    for (const [fieldName, { type, options }] of Object.entries(definition.fields)) {
      const field = fields[type]
      const codeComment = field.definition.inputMeta.codeComment({
        definition: field.definition,
        name: fieldName,
        options,
      })
      if (codeComment && toArray(codeComment).length) {
        ts.newLine('/**')
        for (const line of toArray(codeComment)) {
          ts.newLine(` * ${line}`)
        }
        ts.newLine(' */')
      }
      ts.newLine(`${fieldName}: `).add(dbToJsType(fields[type]?.definition.type.db))
    }
    ts.newLine('}')
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Casted field type
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface CastedFieldType {')
  for (const { definition } of collectionsArray) {
    ts.newLine(`'${definition.name}': {`)
    for (const [fieldName, { type, options }] of Object.entries(definition.fields)) {
      const field = fields[type]
      const codeComment = field.definition.inputMeta.codeComment({
        definition: field.definition,
        name: fieldName,
        options,
      })
      if (codeComment && toArray(codeComment).length) {
        ts.newLine('/**')
        for (const line of toArray(codeComment)) {
          ts.newLine(` * ${line}`)
        }
        ts.newLine(' */')
      }
      const generatedType = field
        ? isString(field.definition.type.ts)
          ? field.definition.type.ts
          : field.definition.type.ts({ definition: field.definition, fields: fieldsMap, name: fieldName, options })
        : 'unknown'
      ts.newLine(`${fieldName}: `)
      if (generatedType.includes('\n')) {
        for (const [i, v] of generatedType.split('\n').entries()) {
          if (i === 0) {
            ts.add(v)
          } else {
            ts.newLine(v)
          }
        }
      } else {
        ts.add(generatedType)
      }
    }
    ts.newLine('}')
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Populated field type
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface PopulatedFieldType {')
  const resolvedFieldDefinitions: Record<string, ResolvedFieldDefinition> = {}
  for (const { definition } of Object.values(fields)) {
    resolvedFieldDefinitions[definition.name] = definition
  }
  for (const { definition } of collectionsArray) {
    ts.newLine(`'${definition.name}': {`)
    for (const [fieldName, { type, options, additional }] of Object.entries(definition.fields)) {
      const field = fields[type]
      const population: ResolvedFieldPopulation | false = additional?.population
        ? resolveFieldPopulation(additional.population)
        : field?.definition.population
      const resolvedOptions = resolveCollectionFieldOptions(
        `generator:${definition.name}`,
        type,
        fieldName,
        options,
        resolvedFieldDefinitions,
      )
      const codeComment = field.definition.inputMeta.codeComment({
        definition: field.definition,
        name: fieldName,
        options: resolvedOptions,
      })
      if (codeComment && toArray(codeComment).length) {
        ts.newLine('/**')
        for (const line of toArray(codeComment)) {
          ts.newLine(` * ${line}`)
        }
        ts.newLine(' */')
      }
      const generatedType = population
        ? isString(population.type.ts)
          ? population.type.ts
          : population.type.ts({
              definition: field.definition,
              fields: fieldsMap,
              name: fieldName,
              options: resolvedOptions,
            })
        : field
        ? isString(field.definition.type.ts)
          ? field.definition.type.ts
          : field.definition.type.ts({
              definition: field.definition,
              fields: fieldsMap,
              name: fieldName,
              options: resolvedOptions,
            })
        : 'unknown'
      ts.newLine(`${fieldName}: `)
      if (generatedType.includes('\n')) {
        for (const [i, v] of generatedType.split('\n').entries()) {
          if (i === 0) {
            ts.add(v)
          } else {
            ts.newLine(v)
          }
        }
      } else {
        ts.add(generatedType)
      }
    }
    ts.newLine('}')
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Field name by type
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface FieldNameByType {')
  for (const { definition } of collectionsArray) {
    ts.newLine(`'${definition.name}': {`)
    const fieldsByType: Record<string, string[]> = Object.fromEntries(
      Object.values(fields).map(({ definition }) => [definition.name, []]),
    )
    for (const [fieldName, { type }] of Object.entries(definition.fields)) {
      fieldsByType[type].push(fieldName)
    }
    for (const [type, fieldNames] of Object.entries(fieldsByType)) {
      ts.newLine(`'${type}': ${unifyLiteralStrings(...fieldNames)},`)
    }
    ts.newLine(`}`)
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | CreateInput
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface CreateInput {')
  for (const { definition } of collectionsArray) {
    ts.newLine(`'${definition.name}': {`)
    for (const [fieldName, { type, options }] of Object.entries(definition.fields)) {
      if (fieldName !== 'id') {
        const field = fields[type]
        if (field) {
          const required = field.definition.inputMeta.required({
            definition: field.definition,
            name: fieldName,
            options,
          })
          const codeComment = field.definition.inputMeta.codeComment({
            definition: field.definition,
            name: fieldName,
            options,
          })
          if (codeComment && toArray(codeComment).length) {
            ts.newLine('/**')
            for (const line of toArray(codeComment)) {
              ts.newLine(` * ${line}`)
            }
            ts.newLine(' */')
          }
          const generatedType = isString(field.definition.inputMeta.type)
            ? field.definition.inputMeta.type
            : field.definition.inputMeta.type({
                definition: field.definition,
                fields: fieldsMap,
                name: fieldName,
                options,
              })
          ts.newLine(`${fieldName}${required ? '' : '?'}: `)
          if (generatedType.includes('\n')) {
            for (const [i, v] of generatedType.split('\n').entries()) {
              if (i === 0) {
                ts.add(v)
              } else {
                ts.newLine(v)
              }
            }
          } else {
            ts.add(generatedType)
          }
        } else {
          ts.newLine(`${fieldName}?: unknown`)
        }
      }
    }
    if (getModuleOption('uploads') && definition.name === 'uploads') {
      ts.newLine('/**')
        .newLine(' * Represents a `File` to upload and associate with the current input.')
        .newLine(' */')
        .newLine('$file: File')
    }
    ts.newLine('}')
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | UpdateInput
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface UpdateInput {')
  for (const { definition } of collectionsArray) {
    ts.newLine(
      `'${definition.name}': Omit<Partial<CreateInput['${definition.name}']>, ImmutableFieldName['${definition.name}']>`,
    )
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Search structure
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface CollectionSearchStructure {')
  for (const { definition } of collectionsArray) {
    ts.newLine(`'${definition.name}': `)
    if (definition.search) {
      ts.add(unifyLiteralStrings(...Object.keys(definition.search)))
    } else {
      ts.add('unknown')
    }
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Standard collections
  |--------------------------------------------------------------------------
  |
  */
  for (const name of standardCollections) {
    const from = relativeImport(
      dotPruviousPath,
      resolveModulePath('./runtime/collections/standard', `${name}.collection`),
    )
    tsStandard.newDecl(`import { default as standard${pascalCase(name)}CollectionDefinition } from '${from}'`)
    tsStandard.newLine(`export { standard${pascalCase(name)}CollectionDefinition }`)
  }

  /*
  |--------------------------------------------------------------------------
  | .pruvious/collections.ts
  |--------------------------------------------------------------------------
  |
  */
  write(resolveAppPath('./.pruvious/collections.ts'), tsCollections.getContent())

  /*
  |--------------------------------------------------------------------------
  | Dashboard components
  |--------------------------------------------------------------------------
  |
  */
  tsDashboard.newDecl(`export const tableAdditionalCollectionOptions = {`)
  for (const { definition } of collectionsArray) {
    const componentPath = definition.dashboard.overviewTable.additionalTableRowOptionsVueComponent
      ? definition.dashboard.overviewTable.additionalTableRowOptionsVueComponent.startsWith('~')
        ? resolveModulePath(definition.dashboard.overviewTable.additionalTableRowOptionsVueComponent.replace('~', ''))
        : resolveAppPath(definition.dashboard.overviewTable.additionalTableRowOptionsVueComponent)
      : null
    if (componentPath) {
      tsDashboard.newLine(
        `'${definition.name}': () => defineAsyncComponent(() => import('${relativeDotPruviousImport(
          componentPath,
        )}')),`,
      )
    } else {
      tsDashboard.newLine(`'${definition.name}': null,`)
    }
  }
  tsDashboard.newLine(`}`)

  tsDashboard.newDecl(`export const recordAdditionalCollectionOptions = {`)
  for (const { definition } of collectionsArray) {
    const componentPath = definition.dashboard.additionalRecordOptionsVueComponent
      ? definition.dashboard.additionalRecordOptionsVueComponent.startsWith('~')
        ? resolveModulePath(definition.dashboard.additionalRecordOptionsVueComponent.replace('~', ''))
        : resolveAppPath(definition.dashboard.additionalRecordOptionsVueComponent)
      : null
    if (componentPath) {
      tsDashboard.newLine(
        `'${definition.name}': () => defineAsyncComponent(() => import('${relativeDotPruviousImport(
          componentPath,
        )}')),`,
      )
    } else {
      tsDashboard.newLine(`'${definition.name}': null,`)
    }
  }
  tsDashboard.newLine(`}`)

  const customFieldLayoutComponents: string[] = []
  tsDashboard.newDecl(`export const customFieldLayoutComponents = {`)
  for (const { definition } of collectionsArray) {
    for (const { componentPath, componentImport } of extractCustomFieldLayoutComponents(
      definition.dashboard.fieldLayout,
    )) {
      if (!customFieldLayoutComponents.includes(componentPath)) {
        customFieldLayoutComponents.push(componentPath)
        tsDashboard.newLine(
          `'${componentPath}': () => defineAsyncComponent(() => import('${relativeDotPruviousImport(
            componentImport,
          )}')),`,
        )
      }
    }
  }
  tsDashboard.newLine(`}`)
}

function extractCustomFieldLayoutComponents(
  fieldLayout: FieldLayout[],
): { componentPath: string; componentImport: string }[] {
  const components: { componentPath: string; componentImport: string }[] = []

  for (const item of fieldLayout) {
    if (isString(item) && item.startsWith('<') && item.endsWith('>')) {
      const componentPath = item.match(/<\s*(.*)\s*\/?\s*>/)?.[1]

      if (componentPath?.startsWith('~')) {
        components.push({ componentPath: item, componentImport: resolveModulePath(componentPath.replace('~', '')) })
      } else if (componentPath) {
        components.push({ componentPath: item, componentImport: resolveLayerPath(componentPath) })
      }
    } else if (isArray(item)) {
      components.push(...extractCustomFieldLayoutComponents(item))
    } else if (isObject(item)) {
      for (const subitem of Object.values(item)) {
        components.push(...extractCustomFieldLayoutComponents(subitem))
      }
    }
  }

  return components
}
