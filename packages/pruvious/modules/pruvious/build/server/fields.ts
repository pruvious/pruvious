import { camelCase } from '@pruvious/utils'
import { useNuxt } from 'nuxt/kit'
import { relative } from 'pathe'
import { debug } from '../../debug/console'
import { resolveFieldDefinitionFiles } from '../../fields/resolver'

/**
 * Generates the `#pruvious/server/fields.ts` file content.
 */
export function getServerFieldsFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  debug(`Generating <${relative(nuxt.options.workspaceDir, pruviousOptions.dir.build)}/server/fields.ts>`)

  const fieldDefinitionFiles = resolveFieldDefinitionFiles()
  const fieldDefinitionEntries = Object.entries(fieldDefinitionFiles)

  return [
    ...(nuxt.options.runtimeConfig._tsCheckPruvious ? [] : [`// @ts-nocheck`]),
    ...fieldDefinitionEntries.map(([name, { file }]) => `import _${camelCase(name)}Field from '${file.import}'`),
    ``,
    `/**`,
    ` * Type representing all defined field types.`,
    ` * The keys are the field names, and the values are the \`Field\` definition objects.`,
    ` */`,
    `export type Fields = {`,
    ...fieldDefinitionEntries.map(([name]) => `  '${name}': ReturnType<typeof _${camelCase(name)}Field.serverFn>,`),
    `}`,
    ``,
    `/**`,
    ` * Represents the type structure for all available field configuration options.`,
    ` * The keys are the field names, and the values are the field options.`,
    ` */`,
    `export type FieldOptions = {`,
    ...fieldDefinitionEntries.map(([name]) => `  '${name}': typeof _${camelCase(name)}Field.TOptions,`),
    `}`,
    ``,
    ...fieldDefinitionEntries.flatMap(([name, location]) => [
      `export const ${camelCase(name)}Field = _${camelCase(name)}Field.serverFn.bind({ fieldType: '${camelCase(name)}', location: ${JSON.stringify({ file: { absolute: location.file.absolute, relative: location.file.relative }, srcDir: location.layer.config.srcDir })} })`,
    ]),
  ].join('\n')
}
