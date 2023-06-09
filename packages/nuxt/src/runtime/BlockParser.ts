import { codeFrame } from '@pruvious-test/build'
import { Block, Field } from '@pruvious-test/shared'
import { camelToLabel, isObject, offsetToLineColumn } from '@pruvious-test/utils'
import fs from 'fs'
import path from 'path'
import ts from 'typescript'
import { evaluate } from './evaluator'
import { format } from './formatter'

export class BlockParser {
  block: Block = { name: '', fields: [] }

  path: string

  dir: string

  baseName: string

  content: string

  source?: ts.SourceFile

  outPath?: string

  hasErrors: boolean = false

  protected scriptContent = ''

  protected offset = 0

  protected codeErrors: string[] = []

  constructor(path: string, dir: string, content = '') {
    this.path = path
    this.dir = dir
    this.baseName = this.path
      .replace(this.dir, '')
      .replace(/\.vue$/, '')
      .replace(/\//g, '')
    this.content = content
    this.block.name = this.baseName
  }

  parse(): this {
    const scriptMatch = this.content.match(
      /(<\s*script\s(?:[^>]*?\s+)?setup(?:\s+[^>]*?)?>)(.*?)<\/\s*script\s*>/ms,
    )
    this.scriptContent = scriptMatch ? scriptMatch[2] : ''
    this.offset = scriptMatch ? (scriptMatch.index ?? 0) + scriptMatch[1].length : 0
    this.source = ts.createSourceFile(this.path, this.scriptContent, ts.ScriptTarget.Latest, true)

    for (const _statement of this.source.statements) {
      // defineProps statement and properties
      let statement: ts.Statement | undefined
      let properties: ts.NodeArray<ts.ObjectLiteralElementLike> | undefined

      /*
      |
      | defineBlock()
      |
      */
      if (
        ts.isExpressionStatement(_statement) &&
        ts.isCallExpression(_statement.expression) &&
        ts.isIdentifier(_statement.expression.expression) &&
        _statement.expression.expression.escapedText === 'defineBlock' &&
        _statement.expression.arguments.length &&
        ts.isObjectLiteralExpression(_statement.expression.arguments[0])
      ) {
        const args = this.scriptContent
          .slice(_statement.expression.arguments[0].pos, _statement.expression.arguments[0].end)
          .trim()

        if (args) {
          const evaluatedArgs = evaluate(args)

          if (isObject(evaluatedArgs)) {
            Object.assign(this.block, evaluatedArgs)
          }
        }
      }

      /*
      |
      | defineProps()
      |
      */
      if (ts.isVariableStatement(_statement)) {
        for (const declaration of _statement.declarationList.declarations) {
          if (
            ts.isVariableDeclaration(declaration) &&
            declaration.initializer &&
            ts.isCallExpression(declaration.initializer) &&
            ts.isIdentifier(declaration.initializer.expression) &&
            declaration.initializer.expression.escapedText === 'defineProps' &&
            declaration.initializer.arguments.length &&
            ts.isObjectLiteralExpression(declaration.initializer.arguments[0])
          ) {
            statement = _statement
            properties = declaration.initializer.arguments[0].properties
            break
          }
        }
      } else if (
        ts.isExpressionStatement(_statement) &&
        ts.isCallExpression(_statement.expression) &&
        ts.isIdentifier(_statement.expression.expression) &&
        _statement.expression.expression.escapedText === 'defineProps'
      ) {
        const args = _statement.expression.arguments[0]

        if (args && ts.isObjectLiteralExpression(args)) {
          statement = _statement
          properties = args.properties
        }
      }

      if (statement && properties) {
        /*
        |
        | Fields
        |
        */
        for (const prop of properties) {
          if (
            ts.isPropertyAssignment(prop) &&
            prop.name &&
            ts.isIdentifier(prop.name) &&
            prop.name.escapedText
          ) {
            let initializer: ts.CallExpression | undefined

            if (ts.isCallExpression(prop.initializer)) {
              initializer = prop.initializer
            } else if (ts.isObjectLiteralExpression(prop.initializer)) {
              for (const property of prop.initializer.properties) {
                if (
                  ts.isPropertyAssignment(property) &&
                  ts.isIdentifier(property.name) &&
                  property.name.escapedText.toString() === 'type' &&
                  ts.isCallExpression(property.initializer)
                ) {
                  initializer = property.initializer
                  break
                }
              }
            }

            if (
              initializer &&
              ts.isIdentifier(initializer.expression) &&
              [
                'buttonsField',
                'checkboxesField',
                'checkboxField',
                'dateField',
                'dateTimeField',
                'editorField',
                'fileField',
                'iconField',
                'imageField',
                'linkField',
                'numberField',
                'pageField',
                'postField',
                'presetField',
                'repeaterField',
                'roleField',
                'sizeField',
                'selectField',
                'sliderField',
                'switchField',
                'textField',
                'textAreaField',
                'timeField',
                'urlField',
                'userField',
              ].includes(initializer.expression.escapedText.toString())
            ) {
              const field: any = {
                name: prop.name.escapedText,
                type: initializer.expression.escapedText.toString().slice(0, -5),
              }

              if (
                ['buttons', 'checkboxes', 'select'].includes(field.type) &&
                initializer.typeArguments?.length
              ) {
                if (ts.isUnionTypeNode(initializer.typeArguments[0])) {
                  for (const type of initializer.typeArguments[0].types) {
                    if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
                      if (!field.choices) {
                        field.choices = []
                      }

                      field.choices.push({
                        label: camelToLabel(type.literal.text),
                        value: type.literal.text,
                      })
                    }
                  }
                } else if (
                  ts.isLiteralTypeNode(initializer.typeArguments[0]) &&
                  ts.isStringLiteral(initializer.typeArguments[0].literal)
                ) {
                  field.choices = [
                    {
                      label: camelToLabel(initializer.typeArguments[0].literal.text),
                      value: initializer.typeArguments[0].literal.text,
                    },
                  ]
                }
              } else if (
                ['file', 'page', 'post', 'preset', 'role', 'user'].includes(field.type) &&
                initializer.typeArguments?.length
              ) {
                const i = field.type === 'post' ? 1 : 0
                const argument = initializer.typeArguments[i]

                if (ts.isUnionTypeNode(argument)) {
                  for (const type of argument.types) {
                    if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
                      if (!field.returnFields) {
                        field.returnFields = []
                      }

                      field.returnFields.push(type.literal.text)
                    }
                  }
                } else if (ts.isLiteralTypeNode(argument) && ts.isStringLiteral(argument.literal)) {
                  field.returnFields = [argument.literal.text]
                }
              } else if (field.type === 'size' && initializer.typeArguments?.length) {
                for (const [i, fieldProp] of ['names', 'units'].entries()) {
                  const argument = initializer.typeArguments[i]

                  if (argument) {
                    if (ts.isUnionTypeNode(argument)) {
                      for (const type of argument.types) {
                        if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
                          if (!field[fieldProp]) {
                            field[fieldProp] = []
                          }

                          field[fieldProp].push(type.literal.text)
                        }
                      }
                    } else if (
                      ts.isLiteralTypeNode(argument) &&
                      ts.isStringLiteral(argument.literal)
                    ) {
                      field[fieldProp] = [argument.literal.text]
                    }
                  }
                }
              }

              const args = this.scriptContent
                .slice(initializer.arguments.pos, initializer.arguments.end)
                .trim()

              if (args) {
                const evaluatedArgs = evaluate(args)

                if (isObject(evaluatedArgs)) {
                  Object.assign(field, evaluatedArgs)
                }
              }

              if (field.type === 'repeater' && !field.subFields) {
                field.subFields = []
              }

              this.block.fields.push(field as Field)
            }
          }
        }
      }
    }

    this.hasErrors = this.codeErrors.length > 0

    if (this.hasErrors) {
      this.codeErrors.forEach((error) => console.log(error))
      console.log('')
    }

    return this
  }

  protected codeError(message: string, tag: ts.JSDocTag, find?: string): void {
    let offset = -1

    if (find) {
      offset = tag.getFullText().toString().indexOf(` ${find}`)

      if (offset > 0) {
        offset++
      } else {
        offset = tag.getFullText().toString().indexOf(find)
      }
    }

    const { start, end } =
      offset > tag.tagName.escapedText.toString().length
        ? offsetToLineColumn(
            this.content,
            tag.pos + this.offset + offset,
            tag.pos + this.offset + offset + find!.length,
          )
        : offsetToLineColumn(
            this.content,
            tag.tagName.pos + this.offset - 1,
            tag.tagName.end + this.offset,
          )

    this.codeErrors.push(codeFrame(message, this.path, this.content, start, end, 'warn', true))
  }

  resolveOutPath(cmsDir: string): this {
    this.outPath = path.resolve(
      `${cmsDir}/blocks/${this.baseName}.${process.env.PRUVIOUS_DEV ? 'js' : 'ts'}`,
    )
    return this
  }

  output(cmsDir: string): this {
    const content = process.env.PRUVIOUS_DEV
      ? [
          `// @ts-check`,
          ``,
          `/** @type {import('@pruvious-test/cms').BlockFactory} */`,
          `module.exports = async () => (${JSON.stringify(this.block, undefined, 2)})`,
          ``,
        ]
      : [
          `import { Block } from '@pruvious-test/cms'`,
          ``,
          `export default async (): Promise<Block> => (${JSON.stringify(
            this.block,
            undefined,
            2,
          )})`,
          ``,
        ]

    const formattedContent = format(content.join('\n'))

    if (!fs.existsSync(`${cmsDir}/blocks`)) {
      fs.mkdirSync(`${cmsDir}/blocks`)
    }

    this.resolveOutPath(cmsDir)

    if (fs.existsSync(this.outPath!)) {
      const existingContent = fs.readFileSync(this.outPath!, 'utf-8')

      if (existingContent !== formattedContent) {
        fs.writeFileSync(this.outPath!, formattedContent)
      }
    } else {
      fs.writeFileSync(this.outPath!, formattedContent)
    }

    return this
  }
}
