const organizeAttributes = require('prettier-plugin-organize-attributes')
const tailwind = require('prettier-plugin-tailwindcss')

module.exports = {
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
  plugins: [organizeAttributes, tailwind],
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
