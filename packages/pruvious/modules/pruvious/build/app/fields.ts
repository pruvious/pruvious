import { useNuxt } from 'nuxt/kit'
import { relative } from 'pathe'
import { debug } from '../../debug/console'
import { resolveFieldDefinitionFiles } from '../../fields/resolver'

/**
 * Generates the `#pruvious/app/fields.ts` file content.
 */
export function getAppFieldsFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  debug(`Generating <${relative(nuxt.options.workspaceDir, pruviousOptions.dir.build)}/app/fields.ts>`)

  const fieldDefinitionFiles = resolveFieldDefinitionFiles()
  const fieldDefinitionEntries = Object.entries(fieldDefinitionFiles)

  return [
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
