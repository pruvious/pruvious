import { format as prettierFormat, Options } from 'prettier'

const options: Options = {
  arrowParens: 'always',
  bracketSpacing: true,
  htmlWhitespaceSensitivity: 'ignore',
  parser: 'babel-ts',
  printWidth: 100,
  quoteProps: 'consistent',
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,
}

export function format(code: string): string {
  try {
    return prettierFormat(code, options)
  } catch (_) {
    return code
  }
}
