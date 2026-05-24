import fs from 'fs-extra'
import { resolveAppPath, resolveUserDirs } from '../instances/path'
import { CodeGenerator } from '../utils/code-generator'
import { relativeImport } from '../utils/fs'
import { unifyLiteralStrings } from '../utils/typescript'

export async function generateIcons(ts: CodeGenerator, tsIcons: CodeGenerator) {
  const dotPruviousPath = resolveAppPath('./.pruvious')
  const iconSources: { name: string; path: string }[] = []

  for (const iconsPath of resolveUserDirs('icons')) {
    if (!fs.existsSync(iconsPath)) continue
    for (const file of fs.readdirSync(iconsPath)) {
      if (!file.endsWith('.vue')) continue
      const name = file.replace(/\.vue$/, '')
      if (iconSources.some((s) => s.name === name)) continue
      iconSources.push({ name, path: `${iconsPath}/${file}` })
    }
  }

  const icons = iconSources.map((s) => s.name)

  ts.newDecl(`export const icons = [${icons.map((icon) => `'${icon}'`).join(', ')}]`)
  ts.newDecl(`export type Icon = ${unifyLiteralStrings(...icons)}`)

  tsIcons
    .newDecl(`// @ts-nocheck`)
    .newLine(`import { defineAsyncComponent } from '#imports'`)
    .newDecl(`export const iconImports = {`)
  for (const { name, path } of iconSources) {
    const relativePath = relativeImport(dotPruviousPath, path)
    tsIcons.newLine(`'${name}': () => defineAsyncComponent(() => import('${relativePath}')),`)
  }
  tsIcons.newLine('}')
}
