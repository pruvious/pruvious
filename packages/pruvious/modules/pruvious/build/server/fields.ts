import { camelCase } from '@pruvious/utils'
import { useNuxt } from 'nuxt/kit'
import { resolveFieldDefinitionFiles } from '../../fields/resolver'

/**
 * Generates the `#pruvious/server/fields.ts` file content.
 */
export function getServerFieldsFileContent() {
  const nuxt = useNuxt()

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
    ` * Type representing all defined field type names.`,
    ` */`,
    `export type FieldType = keyof Fields`,
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
