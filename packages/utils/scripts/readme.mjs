import fs from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { kebabCase } from '../dist/string/case.mjs'

const currentDir = dirname(fileURLToPath(import.meta.url))
const sections = []

for (const dir of fs.readdirSync(resolve(currentDir, '../src'))) {
  if (fs.lstatSync(resolve(currentDir, `../src/${dir}`)).isDirectory()) {
    const section = {
      title: dir.slice(0, 1).toUpperCase() + dir.slice(1),
      content: [],
    }

    for (const file of fs.readdirSync(resolve(currentDir, `../src/${dir}`))) {
      const code = fs.readFileSync(resolve(currentDir, `../src/${dir}/${file}`), 'utf-8')
      const sourceFile = ts.createSourceFile('', code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)
      const result = ts.transform(sourceFile, [])

      for (const statement of result.transformed[0].statements) {
        let name = ''
        let params = []
        let comment = ''

        if (ts.isFunctionDeclaration(statement)) {
          const commentRanges = ts.getLeadingCommentRanges(sourceFile.getFullText(), statement.getFullStart())
          name = statement.name.text
          params = statement.parameters.map((param) => param.name.getText())
          comment = commentRanges?.length
            ? sourceFile.getFullText().slice(commentRanges[0].pos, commentRanges[0].end)
            : ''
        }

        if (name) {
          section.content.push({
            name,
            params,
            comment: comment
              .replace(/^\/\*\*/gm, '')
              .replace(/^ \*\//gm, '')
              .replace(/^ *\* */gm, '')
              .replace(/@example/g, '**Example:**\n')
              .replace(/@param ([a-zA-Z0-9_$]+)/g, '- `$1` -')
              .replace(/@returns/g, '**Returns**')
              .trim(),
          })
        }
      }
    }

    section.content.sort((a, b) => a.name.localeCompare(b.name))
    sections.push(section)
  }
}

let readme = `# @pruvious/utils

Compilation of JavaScript utility functions and TypeScript types.

## Installation

\`\`\`sh
npm install @pruvious/utils
\`\`\`

## Table of contents

`

for (const { title, content } of sections) {
  readme += `- [${title}](#${kebabCase(title)})\n`

  for (const { name } of content) {
    readme += `  - [${name}](#${name.toLowerCase()})\n`
  }
}

readme += `\n`

for (const { title, content } of sections) {
  readme += `## <a id="${kebabCase(title)}">${title}</a>\n\n`

  for (const { name, params, comment } of content) {
    const p = params.length ? `(${params.join(', ')})` : ''
    readme += `### <a id="${name.toLowerCase()}">\`${name + p}\`</a>\n\n${comment}\n\n`
  }
}

readme += `## License

This package is licensed under the [MIT License](./LICENSE).
`

fs.writeFileSync(resolve(currentDir, '../README.md'), readme)
