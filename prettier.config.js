export default {
  arrowParens: 'always',
  bracketSpacing: true,
  htmlWhitespaceSensitivity: 'ignore',
  printWidth: 120,
  quoteProps: 'consistent',
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,
  plugins: ['prettier-plugin-organize-attributes'],
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
