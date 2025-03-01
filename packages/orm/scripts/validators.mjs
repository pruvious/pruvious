import fs from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const validators = []

for (const file of fs.readdirSync(resolve(currentDir, '../src/validators'))) {
  if (fs.lstatSync(resolve(currentDir, `../src/validators/${file}`)).isFile()) {
    const code = fs.readFileSync(resolve(currentDir, `../src/validators/${file}`), 'utf-8')

    if (code.includes('Validator<')) {
      const comment = code
        .match(/\/\*\*\r?\n(.*?)\r?\n \*\/\r?\nexport function/s)?.[1]
        .split('\n')
        .map((line) => line.trim().replace(/\* ?/, ''))

      validators.push({ name: file.replace('.ts', ''), comment })
    }
  }
}

fs.writeFileSync(
  resolve(currentDir, '../src/validators/meta.ts'),
  'export const validatorsMeta = [\n' +
    validators
      .map(
        ({ name, comment }) =>
          `  { name: '${name}', comment: [${comment.map((line) => `'${line.replaceAll("'", "\\'")}'`).join(', ')}] }`,
      )
      .join(',\n') +
    ']\n',
)
