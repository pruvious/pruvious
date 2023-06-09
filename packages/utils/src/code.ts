/**
 * Parse and return at-parameters from comment blocks and the keyword after.
 *
 * @example
 * extractComments('/**\n * @foo bar\n *\/') // [{ params: { foo: 'bar' }, index: 0 }]
 */
export function extractComments(
  code: string,
): { params: { [param: string]: string }; keyword?: string; index: number }[] {
  const regex = /^\s*\/\*\*(.+?)^\s*\*\/\n* *([a-z][a-zA-Z0-9]*)?/gms
  const blocks: { params: { [param: string]: string }; keyword?: string; index: number }[] = []
  let match: RegExpExecArray | null

  do {
    match = regex.exec(code)

    if (match) {
      const block = { params: {}, index: match.index }
      let currentParam: { param: string; value: string } | undefined

      match[1]
        .replace(/^ *\* */gm, '')
        .split('\n')
        .forEach((line) => {
          if (line.startsWith('@')) {
            const paramMatch = line.match(/^@([a-z][a-zA-Z0-9]*) +(.+)$/)

            if (currentParam) {
              block.params[currentParam.param] = currentParam.value
              currentParam = undefined
            }

            if (paramMatch) {
              currentParam = { param: paramMatch[1], value: paramMatch[2].trim() }
            }
          } else if (currentParam && line.trim()) {
            currentParam.value += ' ' + line.trim()
          }
        })

      if (currentParam) {
        block.params[currentParam.param] = currentParam.value
        currentParam = undefined
      }

      if (match[2]) {
        block['keyword'] = match[2]
      }

      blocks.push(block)
    }
  } while (match)

  return blocks
}

/**
 * Transform an indented `code` by removing base indents from every line and assuring
 * that all lines start with `minSpaces` spaces.
 *
 * @example
 * flattenIndents(' foo\n  bar') // 'foo\n bar'
 * flattenIndents(' foo\n  bar', 1) // ' foo\n  bar'
 * flattenIndents('foo\n  bar', 1) // ' foo\n  bar'
 */
export function flattenIndents(code: string, minSpaces: number = 0): string {
  let base: number | undefined

  const lines = code.split('\n')
  const diff = lines.map((line) => {
    if (!line.trim()) {
      return 0
    }

    let spaces: number = 0

    for (const char of line) {
      if (char === ' ') {
        spaces++
      } else {
        break
      }
    }

    const diff = spaces - minSpaces

    if (base === undefined || diff < base) {
      base = Math.max(diff, 0)
    }

    return diff
  })

  base = base ?? 0

  return lines
    .map((line, i) => {
      const count = minSpaces + Math.max(diff[i] - base!, 0)
      return ' '.repeat(count) + line.trimStart()
    })
    .join('\n')
}

/**
 * Transform an offset `code` range specified with `from` and `to` to line-column pairs.
 *
 * @example
 * offsetToLineColumn('foo', 1, 3) // [1, 1], [1, 3]
 */
export function offsetToLineColumn(
  code: string,
  from: number,
  to?: number,
): { start: [line: number, column: number]; end: [line: number, column: number] } {
  const rows = code.split('\n')
  const start: [line: number, column: number] = [-1, -1]
  const end: [line: number, column: number] = [-1, -1]

  if (to === undefined) {
    to = from
  }

  let prevCharacters: number = 0

  for (const [index, row] of rows.entries()) {
    if (start[0] === -1 && from <= prevCharacters + row.length) {
      start[0] = index + 1
      start[1] = Math.min(from - prevCharacters, row.length) + 1
    }

    if (end[0] === -1 && to <= prevCharacters + row.length) {
      end[0] = index + 1
      end[1] = Math.min(to - prevCharacters, row.length) + 1
    }

    if (start[0] + end[0] > 1) {
      break
    }

    prevCharacters += row.length + 1
  }

  if (start[0] === -1) {
    start[0] = rows.length
    start[1] = rows[start[0] - 1].length + 1
    end[0] = start[0]
    end[1] = start[1]
  }

  if (end[0] === -1) {
    end[0] = rows.length
    end[1] = rows[end[0] - 1].length + 1
  }

  if (start[0] === end[0] && end[1] < start[1]) {
    end[1] = start[1]
  }

  return { start, end }
}

/**
 * Transform a `code` range with line-column pairs specified with `start` and `end`
 * to an offset range.
 *
 * @example
 * lineColumnToOffset('foo', [1, 1], [1, 3]) // { from: 1, to: 3 }
 */
export function lineColumnToOffset(
  code: string,
  start: [line: number, column: number],
  end?: [line: number, column: number],
): { from: number; to: number } {
  const rows = code.split('\n')

  let from: number = 0
  let to: number = 0

  if (!end) {
    end = start
  }

  const startRow = rows[start[0] - 1]
  const endRow = rows[end[0] - 1]

  if (startRow === undefined) {
    from = code.length
  } else {
    let prev: number = start[0] - 1

    for (let i = 0; i < start[0] - 1; i++) {
      prev += rows[i]?.length ?? 0
    }

    from = Math.min(start[1] - 1, startRow.length) + prev
  }

  if (endRow === undefined) {
    to = code.length
  } else {
    let prev: number = end[0] - 1

    for (let i = 0; i < end[0] - 1; i++) {
      prev += rows[i]?.length ?? 0
    }

    to = Math.max(Math.min(end[1] - 1, endRow.length) + prev, from)
  }

  return { from, to }
}
