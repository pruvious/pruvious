import fs from 'fs-extra'
import { resolveAppPath } from '../instances/path'
import { CodeGenerator } from '../utils/code-generator'
import { relativeImport } from '../utils/fs'
import { unifyLiteralStrings } from '../utils/typescript'

export async function generateIcons(ts: CodeGenerator, tsIcons: CodeGenerator) {
  const dotPruviousPath = resolveAppPath('./.pruvious')
  const iconsPath = resolveAppPath('./icons')
  const icons = fs.existsSync(iconsPath)
    ? fs
        .readdirSync(iconsPath)
        .filter((f) => f.endsWith('.vue'))
        .map((f) => f.replace(/\.vue$/, ''))
    : []

  ts.newDecl(`export const icons = [${icons.map((icon) => `'${icon}'`).join(', ')}]`)
  ts.newDecl(`export type Icon = ${unifyLiteralStrings(...icons)}`)

  tsIcons
    .newDecl(`// @ts-nocheck`)
    .newLine(`import { defineAsyncComponent } from '#imports'`)
    .newDecl(`export const iconImports = {`)
  for (const icon of icons) {
    const relativePath = relativeImport(dotPruviousPath, `${iconsPath}/${icon}.vue`)
    tsIcons.newLine(`'${icon}': () => defineAsyncComponent(() => import('${relativePath}')),`)
  }
  tsIcons.newLine('}')
}
