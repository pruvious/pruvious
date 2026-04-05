import { useNuxt } from 'nuxt/kit'
import { resolveFieldDefinitionFiles } from '../../fields/resolver'

/**
 * Generates the `#pruvious/app/fields.ts` file content.
 */
export function getAppFieldsFileContent() {
  const nuxt = useNuxt()

  const fieldDefinitionFiles = resolveFieldDefinitionFiles()
  const fieldDefinitionEntries = Object.entries(fieldDefinitionFiles)

  return [
    ...(nuxt.options.runtimeConfig._tsCheckPruvious ? [] : [`// @ts-nocheck`]),
    ...fieldDefinitionEntries.map(([name, { file }]) => `import type _${name}Field from '${file.import}'`),
    ``,
    `const _fieldFn = () => null`,
    ``,
    ...fieldDefinitionEntries.flatMap(([name]) => [
      `export const ${name}Field = _fieldFn as unknown as typeof _${name}Field.clientFn`,
    ]),
    ``,
  ].join('\n')
}
