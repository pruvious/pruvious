import { isProduction } from 'std-env'
import { resolveAppPath, resolveModulePath } from '../instances/path'
import { toArray } from '../utils/array'
import { CodeGenerator } from '../utils/code-generator'
import { isBoolean, isNull } from '../utils/common'
import { relativeDotPruviousImport, relativeImport } from '../utils/fs'
import { isRealNumber } from '../utils/number'
import { camelCase, capitalize, isString, pascalCase } from '../utils/string'
import { unifyLiteralStrings, unifyLiterals } from '../utils/typescript'
import type { ResolvedFieldDefinition } from './field.definition'
import { getStandardFieldDefinitions, getStandardFieldNames, type ResolvedField } from './field.resolver'

export function generateFields(
  fields: Record<string, ResolvedField>,
  ts: CodeGenerator,
  tsServer: CodeGenerator,
  tsStandard: CodeGenerator,
  tsDashboard: CodeGenerator,
) {
  const fieldsArray = Object.values(fields)
  const dotPruviousPath = resolveAppPath('./.pruvious')
  const standardFieldNames = getStandardFieldNames()
  const standardFieldDefinitions = getStandardFieldDefinitions()

  /*
  |--------------------------------------------------------------------------
  | Standard field names
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl(`export type StandardFieldName = ${unifyLiteralStrings(...standardFieldNames)}`)

  /*
  |--------------------------------------------------------------------------
  | re-export
  |--------------------------------------------------------------------------
  |
  */
  const definitionPath = resolveModulePath('./runtime/fields/field.definition')
  ts.newDecl(
    `import type { CollectionFieldAdditional, FieldAdditional, FieldInputContext, FieldTypeContext, FieldPopulatorContext, FieldGuardContext, FieldConditionalLogicMatcherContext, FieldSanitizerContext, FieldValidatorContext, FieldGuard, FieldSanitizer, FieldValidator, ResolvedFieldDefinition, ConditionalLogic, ConditionalRule } from '${relativeImport(
      dotPruviousPath,
      definitionPath,
    )}'`,
  ).newLine(
    'export { type CollectionFieldAdditional, type FieldAdditional, type FieldInputContext, type FieldTypeContext, type FieldPopulatorContext, type FieldGuardContext, type FieldConditionalLogicMatcherContext, type FieldSanitizerContext, type FieldValidatorContext, type FieldGuard, type FieldSanitizer, type FieldValidator, type ResolvedFieldDefinition, type ConditionalLogic, type ConditionalRule }',
  )

  ts.newDecl(`import { defineField } from '${relativeImport(dotPruviousPath, definitionPath)}'`).newDecl(
    'export { defineField }',
  )

  for (const { definition, source } of fieldsArray) {
    const from = relativeImport(dotPruviousPath, source)
    tsServer.newDecl(`import { default as ${camelCase(definition.name)}FieldDefinition } from '${from}'`)
    tsServer.newLine(`export { ${camelCase(definition.name)}FieldDefinition }`)
  }

  /*
  |--------------------------------------------------------------------------
  | fields
  |--------------------------------------------------------------------------
  |
  */
  tsServer.newDecl('export const fields = {')
  for (const { definition } of fieldsArray) {
    tsServer.newLine(`'${definition.name}': ${camelCase(definition.name)}FieldDefinition,`)
  }
  tsServer.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Field
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl(
    `export type Field = ${unifyLiterals(
      ...fieldsArray.map(({ definition }) => `${pascalCase(definition.name)}Field`),
    )}`,
  )

  /*
  |--------------------------------------------------------------------------
  | CollectionField
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl(`export type CollectionField = Field & { additional?: CollectionFieldAdditional }`)

  /*
  |--------------------------------------------------------------------------
  | [FieldName]Field
  |--------------------------------------------------------------------------
  |
  */
  for (const { definition } of fieldsArray) {
    ts.newDecl(`export interface ${pascalCase(definition.name)}Field {`)
      .newLine('/**')
      .newLine(` * The field type.`)
      .newLine(' */')
      .newLine(`type: '${definition.name}'`)
      .newLine()
      .newLine('/**')
      .newLine(` * The \`${definition.name}\` field options.`)
      .newLine(' */')
      .newLine(`options: FieldOptions['${definition.name}']`)
      .newLine()
      .newLine('/**')
      .newLine(' * Additional field configurations.')
      .newLine(' */')
      .newLine(`additional?: FieldAdditional`)
      .newLine('}')
  }

  /*
  |--------------------------------------------------------------------------
  | Standard field options
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface StandardFieldOptions {')
  for (const { name, options } of Object.values(standardFieldDefinitions)) {
    ts.newLine(`'${name}': {`)
    for (const [optionName, { type, description }] of Object.entries(options)) {
      if (description) {
        ts.newLine('/**')
        for (const line of toArray(description)) {
          ts.newLine(` * ${line}`)
        }
        ts.newLine(' */')
      }
      ts.newLine(`${optionName + (options[optionName].required ? '' : '?')}: ${type}`)
    }
    ts.newLine('}')
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Field options
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface FieldOptions {')
  fieldsArray.map(({ definition, isStandard }) => {
    if (isStandard) {
      ts.newLine(`'${definition.name}': StandardFieldOptions['${definition.name}']`)
    } else {
      ts.newLine(`'${definition.name}': {`)
      for (const [optionName, { type, description }] of Object.entries(definition.options)) {
        if (description) {
          ts.newLine('/**')
          for (const line of toArray(description)) {
            ts.newLine(` * ${line}`)
          }
          ts.newLine(' */')
        }
        ts.newLine(`${optionName + (definition.options[optionName].required ? '' : '?')}: ${type}`)
      }
      ts.newLine('}')
    }
  })
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | standardFieldDefinition
  |--------------------------------------------------------------------------
  |
  */
  for (const name of standardFieldNames) {
    const from = relativeImport(dotPruviousPath, resolveModulePath('./runtime/fields/standard', `${name}.field`))
    tsStandard.newDecl(`import { default as standard${pascalCase(name)}FieldDefinition } from '${from}'`)
    tsStandard.newLine(`export { standard${pascalCase(name)}FieldDefinition }`)
  }

  /*
  |--------------------------------------------------------------------------
  | Dashboard components
  |--------------------------------------------------------------------------
  |
  */
  for (const { definition, isStandard } of fieldsArray) {
    const fieldComponentPath = definition.vueComponent
      ? resolveAppPath(definition.vueComponent)
      : resolveModulePath('./runtime/components/fields', `${pascalCase(definition.name)}Field.vue`)

    const fieldPreviewComponentPath = isStandard
      ? resolveModulePath('./runtime/components/field-previews', `${pascalCase(definition.name)}FieldPreview.vue`)
      : definition.vuePreviewComponent
      ? resolveAppPath(definition.vuePreviewComponent)
      : definition.type.js === 'boolean'
      ? resolveModulePath('./runtime/components/misc/BooleanFieldPreview.vue')
      : resolveModulePath('./runtime/components/misc/StringFieldPreview.vue')

    tsDashboard
      .newDecl(
        `export const ${camelCase(
          definition.name,
        )}FieldComponent = () => defineAsyncComponent(() => import('${relativeDotPruviousImport(
          fieldComponentPath,
        )}'))`,
      )
      .newLine(
        `export const ${camelCase(
          definition.name,
        )}FieldPreviewComponent = () => defineAsyncComponent(() => import('${relativeDotPruviousImport(
          fieldPreviewComponentPath,
        )}'))`,
      )
  }

  tsDashboard.newDecl(`export const fields = {`)
  for (const { definition } of fieldsArray) {
    tsDashboard.newLine(`'${definition.name}': ${camelCase(definition.name)}FieldComponent,`)
  }
  tsDashboard.newLine(`}`)

  tsDashboard.newDecl(`export const fieldPreviews = {`)
  for (const { definition } of fieldsArray) {
    tsDashboard.newLine(`'${definition.name}': ${camelCase(definition.name)}FieldPreviewComponent,`)
  }
  tsDashboard.newLine(`}`)

  /*
  |--------------------------------------------------------------------------
  | Field types (dashboard)
  |--------------------------------------------------------------------------
  |
  */
  tsDashboard.newDecl(`export const fieldTypes = {`)
  for (const { definition } of fieldsArray) {
    tsDashboard.newLine(`'${definition.name}': '${camelCase(definition.type.js)}',`)
  }
  tsDashboard.newLine(`}`)

  /*
  |--------------------------------------------------------------------------
  | Default field values (dashboard)
  |--------------------------------------------------------------------------
  |
  */
  tsDashboard.newDecl(`export const defaultFieldValues = {`)
  for (const { definition } of fieldsArray) {
    const generated = definition.default({ definition, name: '', options: {} })
    const defaultValue = isNull(generated)
      ? 'null'
      : definition.type.js === 'string'
      ? `'${generated}'`
      : definition.type.js === 'number'
      ? isRealNumber(generated)
        ? generated
        : 0
      : definition.type.js === 'boolean'
      ? isBoolean(generated)
        ? generated
        : false
      : JSON.stringify(generated)
    tsDashboard.newLine(`'${definition.name}': ${defaultValue},`)
  }
  tsDashboard.newLine(`}`)

  /*
  |--------------------------------------------------------------------------
  | Vue helpers
  |--------------------------------------------------------------------------
  |
  */
  fieldsArray.forEach(({ definition, source, hasVueField, hasVueSubfield, hasVueFieldTrap }) => {
    if (hasVueField && !isProduction) {
      const from = relativeImport(dotPruviousPath, source)
      ts.newDecl(`import { vueField as ${camelCase(definition.name)}Field } from '${from}'`)
      ts.newLine(`export { ${camelCase(definition.name)}Field }`)
    } else {
      generateVueField(definition, ts)
    }

    if (hasVueSubfield && !isProduction) {
      const from = relativeImport(dotPruviousPath, source)
      ts.newDecl(`import { vueSubfield as ${camelCase(definition.name)}Subfield } from '${from}'`)
      ts.newLine(`export { ${camelCase(definition.name)}Subfield }`)
    } else {
      generateVueSubfield(definition, ts)
    }

    if (hasVueFieldTrap && !isProduction) {
      const from = relativeImport(dotPruviousPath, source)
      ts.newDecl(`import { vueFieldTrap as ${camelCase(definition.name)}FieldTrap } from '${from}'`)
      ts.newLine(`export { ${camelCase(definition.name)}FieldTrap }`)
    } else {
      generateFieldTrap(definition, ts)
    }
  })
}

/**
 * Write a function that accepts predefined field `options` and returns the **populated** field `type`.
 *
 * The function name is generated from the camel-cased field `name` and `'Field'` suffix.
 * Example: video => videoField(), time-range => timeRangeField(), etc.
 *
 * The generated function is intented to be used in Vue block components to define prop types.
 *
 * See the `defineField()` function and `FieldConfig` type for more information.
 */
export function generateVueField(field: ResolvedFieldDefinition, ts: CodeGenerator) {
  const fnName = `${camelCase(field.name)}Field`
  const hasRequiredOption = Object.values(field.options).some(({ required }) => required)
  const returnType = field.population
    ? isString(field.population.type.ts)
      ? field.population.type.ts
      : field.population.type.js
    : isString(field.type.ts)
    ? field.type.ts
    : field.type.js

  ts.newDecl('/**')
    .newLine(` * Create a new \`${field.name}\` field in a Vue block component.`)
    .newLine(' *')
    .newLine(' * @param options - The field options.')
    .newLine(' * @param additional - Additional field configurations.')
    .newLine(' *')
    .newLine(' * @returns The **populated** field type used to annotate a Vue `prop`.')
    .newLine(' *')
    .newLine(' * @see https://pruvious.com/docs/creating-blocks')
    .newLine(' */')
    .newLine(`export function ${fnName}(`)
    .add(`options${hasRequiredOption ? '' : '?'}: FieldOptions['${field.name}'], `)
    .add(`additional?: FieldAdditional`)
    .add(') {')
    .newLine('return ')
    .add(field.population ? capitalize(field.population.type.js) : capitalize(field.type.js))
    .add(` as unknown as PropType<${returnType}>`)
    .newLine('}')
}

/**
 * Write a function that accepts predefined field `options` and returns the **populated** field `type`.
 *
 * The function name is generated from the camel-cased field `name` and `'Subfield'` suffix.
 * Example: video => videoSubfield(), time-range => timeRangeSubfield(), etc.
 *
 * The generated function is intented to be used in Vue block components to define subfields in prop fields.
 *
 * See the `defineField()` function and `FieldConfig` type for more information.
 */
export function generateVueSubfield(field: ResolvedFieldDefinition, ts: CodeGenerator) {
  const fnName = `${camelCase(field.name)}Subfield`
  const hasRequiredOption = Object.values(field.options).some(({ required }) => required)
  const returnType = field.population
    ? isString(field.population.type.ts)
      ? field.population.type.ts
      : field.population.type.js
    : isString(field.type.ts)
    ? field.type.ts
    : field.type.js

  ts.newDecl('/**')
    .newLine(` * Create a new \`${field.name}\` subfield in a Vue block component.`)
    .newLine(' *')
    .newLine(' * @param options - The field options.')
    .newLine(' * @param additional - Additional field configurations.')
    .newLine(' *')
    .newLine(' * @returns The **populated** field type.')
    .newLine(' *')
    .newLine(' * @see https://pruvious.com/docs/creating-blocks')
    .newLine(' */')
    .newLine(`export function ${fnName}(`)
    .add(`options${hasRequiredOption ? '' : '?'}: FieldOptions['${field.name}'], `)
    .add(`additional?: FieldAdditional`)
    .add(') {')
    .newLine('return ')
    .add(field.population ? capitalize(field.population.type.js) : capitalize(field.type.js))
    .add(` as unknown as ${returnType}`)
    .newLine('}')
}

/**
 * Write a function that accepts field options and returns an object used to identify block fields.
 *
 * The function name is generated from the camel-cased field `name` and the `'FieldTrap'` suffix.
 * Example: video => videoFieldTrap(), time-range => timeRangeFieldTrap(), etc.
 *
 * Note: The generated function is intented for internal use.
 */
export function generateFieldTrap(field: ResolvedFieldDefinition, ts: CodeGenerator) {
  ts.newDecl(`export function ${camelCase(field.name)}FieldTrap`)
    .add(`(options?: any, additional?: any): ${pascalCase(field.name)}Field {`)
    .newLine(`return { type: '${field.name}', options: options || {}, additional, __fromDefineProps: true } as any`)
    .newLine('}')
}
