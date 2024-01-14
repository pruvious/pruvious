import { resolveAppPath, resolveModulePath } from '../instances/path'
import { CodeGenerator } from '../utils/code-generator'
import { relativeImport, removeExcept, write } from '../utils/fs'
import { camelCase } from '../utils/string'
import { unifyLiteralStrings } from '../utils/typescript'
import type { ResolvedLayout } from './layout.resolver'

export function generateLayouts(layouts: Record<string, ResolvedLayout>, ts: CodeGenerator) {
  const layoutsArray = Object.values(layouts)
  const tsLayouts = new CodeGenerator()
  const dotPruviousPath = resolveAppPath('./.pruvious')

  /*
  |--------------------------------------------------------------------------
  | re-export
  |--------------------------------------------------------------------------
  |
  */
  const definitionPath = resolveModulePath('./runtime/layouts/layout.definition')
  ts.newDecl(`import type { LayoutDefinition } from '${relativeImport(dotPruviousPath, definitionPath)}'`).newLine(
    'export { type LayoutDefinition }',
  )

  ts.newDecl(`import { defineLayout } from '${relativeImport(dotPruviousPath, definitionPath)}'`).newLine(
    'export { defineLayout }',
  )

  /*
  |--------------------------------------------------------------------------
  | Layout name
  |--------------------------------------------------------------------------
  |
  */
  ts.newDecl(`export type LayoutName = ${unifyLiteralStrings(...Object.keys(layouts))}`)

  /*
  |--------------------------------------------------------------------------
  | .pruvious/layouts/*
  |--------------------------------------------------------------------------
  |
  */
  removeExcept(resolveAppPath('./.pruvious/layouts'), [
    ...layoutsArray.map(({ definition }) => `${definition.name}.ts`),
    'index.ts',
  ])

  for (const { definition, code } of layoutsArray) {
    write(resolveAppPath('./.pruvious/layouts', `${definition.name}.ts`), code)
  }

  /*
  |--------------------------------------------------------------------------
  | .pruvious/layouts/index.ts
  |--------------------------------------------------------------------------
  |
  */
  for (const { definition } of layoutsArray) {
    tsLayouts.newLine(`import { default as ${camelCase(definition.name)}Layout } from './${definition.name}'`)
  }

  tsLayouts.newDecl('export const layouts = {')
  for (const { definition } of layoutsArray) {
    tsLayouts.newLine(`'${definition.name}': ${camelCase(definition.name)}Layout,`)
  }
  tsLayouts.newLine('}')

  write(resolveAppPath('./.pruvious/layouts/index.ts'), tsLayouts.getContent())
}
