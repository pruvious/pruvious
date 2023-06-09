import prettierPluginOrganizeAttributes from 'prettier-plugin-organize-attributes'
import prettierPluginTailwindcss from 'prettier-plugin-tailwindcss'

export { approve } from './modules/approve'
export { getConfig, updateConfig } from './modules/config'
export { isPruject } from './modules/isPruject'
export { args, resolveArgs } from './modules/resolveArgs'
export { center, error, loadingScreen, newLine, ok, term, vCenter, warn } from './modules/terminal'

export const prettierConfig = {
  arrowParens: 'always',
  bracketSpacing: true,
  htmlWhitespaceSensitivity: 'ignore',
  printWidth: 100,
  quoteProps: 'consistent',
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,
  plugins: [prettierPluginOrganizeAttributes, prettierPluginTailwindcss],
  overrides: [
    {
      files: ['*.vue'],
      options: {
        attributeGroups: [
          '^v-(if|else-if|else)$',
          '^v-for$',
          '^v-',
          '^:(?!class$|style$)',
          '^@',
          '^(?!:?class$|:?style$)',
          '^class$',
          '^:class$',
          '^style$',
          '^:style$',
          '$DEFAULT',
        ],
        attributeSort: 'ASC',
      },
    },
  ],
}
