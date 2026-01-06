import { useNuxt } from 'nuxt/kit'
import { relative } from 'pathe'
import { resolveBlockFiles } from '../../blocks/resolver'
import { debug } from '../../debug/console'

/**
 * Generates the `#pruvious/app/blocks.ts` file content.
 */
export function getAppBlocksFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  debug(`Generating <${relative(nuxt.options.workspaceDir, pruviousOptions.dir.build)}/app/blocks.ts>`)

  const blockFiles = resolveBlockFiles()
  const blockEntries = Object.entries(blockFiles)

  return [
    `import type { Blocks } from '../server'`,
    ``,
    `/**`,
    ` * Key-value object mapping block names to their corresponding Vue components.`,
    ` *`,
    ` * Components are loaded asynchronously using Vue's \`defineAsyncComponent\` function.`,
    ` * They are automatically registered by creating \`.vue\` files in the \`app/blocks/\` directory of the project.`,
    ` *`,
    ` * @example`,
    ` * \`\`\`vue`,
    ` * <template>`,
    ` *   <component v-if="blockComponents[blockName]" :is="blockComponents[blockName]" v-model="props" />`,
    ` * </template>`,
    ` * \`\`\``,
    ` */`,
    `export const blockComponents: Record<keyof Blocks, () => Component> = {`,
    ...blockEntries.map(
      ([name, { file }]) =>
        `  '${name}': () => defineAsyncComponent(() => import('${file.absolute}').then((m) => m.default || m)),`,
    ),
    `}`,
    ``,
  ].join('\n')
}
