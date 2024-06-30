import { resolveAppPath, resolveModulePath } from '../instances/path'
import { uniqueArray } from '../utils/array'
import { CodeGenerator } from '../utils/code-generator'
import { relativeImport, walkDir } from '../utils/fs'
import { isObject } from '../utils/object'
import { camelCase, pascalCase } from '../utils/string'
import { unifyLiteralStrings } from '../utils/typescript'
import type { TranslatableStringsDefinition } from './translatable-strings.definition'
import type { ResolvedTranslatableStrings } from './translatable-strings.resolver'

export function generateTranslatableStrings(
  translatableStrings: Record<string, ResolvedTranslatableStrings>,
  ts: CodeGenerator,
  tsServer: CodeGenerator,
  tsStandard: CodeGenerator,
) {
  const translatableStringsArray = Object.values(translatableStrings)
  const dotPruviousPath = resolveAppPath('./.pruvious')
  const structure: Record<
    string,
    Record<string, { definitionConst: string; definition: Required<TranslatableStringsDefinition> }>
  > = {}

  for (const { definition } of translatableStringsArray) {
    structure[definition.domain] ||= {}
    structure[definition.domain][definition.language] = {
      definition,
      definitionConst: `${camelCase(definition.domain)}_${camelCase(
        definition.language,
      )}_translatableStringsDefinition`,
    }
  }

  if (!structure.default) {
    structure.default = {}
  }

  /*
  |--------------------------------------------------------------------------
  | re-export
  |--------------------------------------------------------------------------
  |
  */
  const definitionPath = resolveModulePath('./runtime/translatable-strings/translatable-strings.definition')

  ts.newDecl(`import { defineTranslatableStrings } from '${relativeImport(dotPruviousPath, definitionPath)}'`).newLine(
    'export { defineTranslatableStrings }',
  )

  tsServer
    .newDecl(
      `import { _, __ } from '${relativeImport(
        dotPruviousPath,
        resolveModulePath('./runtime/utils/server/translate-string'),
      )}'`,
    )
    .newLine('export { _, __ }')

  for (const { definition, source } of translatableStringsArray) {
    const from = relativeImport(dotPruviousPath, source)
    tsServer.newDecl(
      `import { default as ${camelCase(definition.domain)}_${camelCase(
        definition.language,
      )}_translatableStringsDefinition } from '${from}'`,
    )
    tsServer.newLine(
      `export { ${camelCase(definition.domain)}_${camelCase(definition.language)}_translatableStringsDefinition }`,
    )
  }

  /*
  |--------------------------------------------------------------------------
  | translatableStrings
  |--------------------------------------------------------------------------
  |
  */
  tsServer.newDecl('export const translatableStrings = {')
  for (const [domain, languages] of Object.entries(structure)) {
    tsServer.newLine(`'${domain}': {`)
    for (const [language, { definitionConst }] of Object.entries(languages)) {
      tsServer.newLine(`'${language}': ${definitionConst},`)
    }
    tsServer.newLine('},')
  }
  tsServer.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Translatable strings domain
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl(`export type TranslatableStringsDomain = ${unifyLiteralStrings(...Object.keys(structure))}`)

  /*
  |--------------------------------------------------------------------------
  | Public translatable strings domain
  |--------------------------------------------------------------------------
  |
  */
  const publicDomains = Object.entries(structure)
    .filter(([_, languages]) => Object.values(languages).some(({ definition }) => definition.api))
    .map(([domain]) => domain)
  ts.newDecl(
    `export type PublicTranslatableStringsDomain = ${unifyLiteralStrings(
      ...uniqueArray([...publicDomains, 'default']),
    )}`,
  )

  /*
  |--------------------------------------------------------------------------
  | Translatable strings text key
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface TranslatableStringsTextKey {')
  for (const [domain, languages] of Object.entries(structure)) {
    const keys = uniqueArray(
      Object.values(languages)
        .map(({ definition }) => Object.keys(definition.strings))
        .flat(),
    )
    ts.newLine(`'${domain}': ${unifyLiteralStrings(...keys)}`)
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Translatable strings input
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl('export interface TranslatableStringsInput {')
  for (const [domain, languages] of Object.entries(structure)) {
    ts.newLine(`'${domain}': {`)
    const strings = Object.values(languages).map(({ definition }) => definition.strings)
    const usedKeys: string[] = []
    for (const string of strings) {
      for (const [key, value] of Object.entries(string)) {
        if (!usedKeys.includes(key) && isObject(value) && value.input) {
          ts.newLine(`'${key.replaceAll("'", "\\'")}': {`)
          for (const [inputName, inputType] of Object.entries(value.input)) {
            ts.newLine(`'${inputName}': ${inputType}`)
          }
          ts.newLine('}')
          usedKeys.push(key)
        }
      }
    }
    ts.newLine('}')
  }
  ts.newLine('}')

  /*
  |--------------------------------------------------------------------------
  | Standard translatable strings
  |--------------------------------------------------------------------------
  |
  */
  const standardStructure: Record<string, Record<string, string>> = {}
  let i = 0
  for (const { file, fullPath } of walkDir(resolveModulePath('./runtime/translatable-strings/standard'), {
    endsWith: ['.js', '.ts'],
    endsWithout: '.d.ts',
  })) {
    const fileParts = file.split('.')
    const importName = `standard${pascalCase(fileParts[0])}${pascalCase(fileParts[1])}TranslatableStringsDefinition`
    const from = relativeImport(dotPruviousPath, fullPath)
    tsStandard[i ? 'newLine' : 'newDecl'](`import { default as ${importName} } from '${from}'`)
    standardStructure[fileParts[0]] ||= {}
    standardStructure[fileParts[0]][fileParts[1]] = importName
    i++
  }

  tsStandard.newDecl('export const standardTranslatableStringsDefinition = {')
  for (const [domain, languages] of Object.entries(standardStructure)) {
    tsStandard.newLine(`'${domain}': {`)
    for (const [language, importName] of Object.entries(languages)) {
      tsStandard.newLine(`'${language}': ${importName},`)
    }
    tsStandard.newLine('},')
  }
  tsStandard.newLine('}')
}
