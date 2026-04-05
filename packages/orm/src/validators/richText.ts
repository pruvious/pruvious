import { isNull, isObject, isString, pick } from '@pruvious/utils'
import type { GenericDatabase, GenericValidator } from '../core'
import type { CustomErrorMessage } from './types'
import { resolveCustomErrorMessage } from './utils'

function parseAttrsString(attrsStr: string): Record<string, string> {
  const attrRegex = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  const attrs: Record<string, string> = {}
  let match: RegExpExecArray | null

  while ((match = attrRegex.exec(attrsStr)) !== null) {
    attrs[match[1]] = match[2] ?? match[3] ?? ''
  }

  return attrs
}

function resolveExpectedAttrs(
  attrs: Record<string, string> | { class: string | string[] } | { style: Record<string, string> },
): Record<string, string> | undefined {
  if ('class' in attrs) {
    return { class: Array.isArray(attrs.class) ? attrs.class.join(' ') : attrs.class }
  }

  if ('style' in attrs && isObject(attrs.style)) {
    return {
      style: Object.entries(attrs.style)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; '),
    }
  }

  return attrs as Record<string, string>
}

function matchesSpanAttrs(parsedAttrs: Record<string, string>, expectedAttrs: Record<string, string>): boolean {
  const expectedKeys = Object.keys(expectedAttrs)
  const actualKeys = Object.keys(parsedAttrs)

  if (actualKeys.length !== expectedKeys.length) {
    return false
  }

  for (const [key, expectedValue] of Object.entries(expectedAttrs)) {
    const actualValue = parsedAttrs[key]

    if (actualValue === undefined) {
      return false
    }

    if (key === 'class') {
      const expectedClasses = expectedValue.split(' ')
      const actualClasses = actualValue.split(' ')

      if (expectedClasses.length !== actualClasses.length) {
        return false
      }

      if (!expectedClasses.every((c) => actualClasses.includes(c))) {
        return false
      }
    } else if (key === 'style') {
      const normalize = (s: string) =>
        s
          .split(';')
          .map((p) => p.trim())
          .filter(Boolean)
          .sort()
          .join(';')

      if (normalize(actualValue) !== normalize(expectedValue)) {
        return false
      }
    } else if (actualValue !== expectedValue) {
      return false
    }
  }

  return true
}

/**
 * Creates a validator to ensure that the field value only contains allowed HTML marks.
 *
 * - Reads `marks` and `allowLineBreaks` from the field's `definition.options`.
 * - Parses all HTML tags from the value and checks them against the configured marks.
 * - Rejects content with tags that are not in the allowed marks list.
 * - For `<span>` marks with attributes, validates that the attributes match.
 * - Validates `<br>` tags against the `allowLineBreaks` option.
 * - Skips validation when value is `null`.
 * - Throws an error if the validation fails.
 * - The default error message is: 'The rich text content contains disallowed HTML'.
 * - A custom `errorMessage` can be provided as a parameter.
 *   - The `errorMessage` can be a string or a function that returns a string.
 *   - The function receives an object with `_` and `__` properties to access the translation functions.
 */
export function richTextValidator<TDatabase extends GenericDatabase = GenericDatabase>(
  errorMessage?: CustomErrorMessage<TDatabase>,
): GenericValidator {
  return (value, { context, definition }) => {
    if (isNull(value)) {
      return
    }

    if (!isString(value)) {
      const defaultErrorMessage = context.__('pruvious-orm', 'The rich text content contains disallowed HTML')
      throw new Error(resolveCustomErrorMessage(errorMessage, defaultErrorMessage, pick(context, ['_', '__'])))
    }

    const marks: Record<string, { tag?: string; parseTags?: string[]; attrs?: any }> = definition.options.marks ?? {}
    const allowLineBreaks: boolean = definition.options.allowLineBreaks !== false
    const allowedTags = new Set<string>()
    const spanAttrsConfigs: Record<string, string>[] = []

    for (const mark of Object.values(marks)) {
      const tag = mark.tag ?? 'span'

      allowedTags.add(tag)

      for (const parseTag of mark.parseTags ?? []) {
        allowedTags.add(parseTag)
      }

      if (tag === 'span' && mark.attrs) {
        const resolved = resolveExpectedAttrs(mark.attrs)

        if (resolved) {
          spanAttrsConfigs.push(resolved)
        }
      }
    }

    if (allowLineBreaks) {
      allowedTags.add('br')
    }

    const htmlTagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)?\/?>/g
    let match: RegExpExecArray | null

    while ((match = htmlTagRegex.exec(value)) !== null) {
      const tagName = match[1].toLowerCase()
      const attrsStr = match[2] ?? ''
      const isClosing = match[0].startsWith('</')

      if (!allowedTags.has(tagName)) {
        const defaultErrorMessage = context.__('pruvious-orm', 'The rich text content contains disallowed HTML')
        throw new Error(resolveCustomErrorMessage(errorMessage, defaultErrorMessage, pick(context, ['_', '__'])))
      }

      if (!isClosing) {
        if (tagName === 'span' && spanAttrsConfigs.length > 0) {
          const parsedAttrs = parseAttrsString(attrsStr)
          const matchesAny = spanAttrsConfigs.some((expected) => matchesSpanAttrs(parsedAttrs, expected))

          if (!matchesAny) {
            const defaultErrorMessage = context.__('pruvious-orm', 'The rich text content contains disallowed HTML')
            throw new Error(resolveCustomErrorMessage(errorMessage, defaultErrorMessage, pick(context, ['_', '__'])))
          }
        } else if (tagName !== 'span' && attrsStr.trim()) {
          const defaultErrorMessage = context.__('pruvious-orm', 'The rich text content contains disallowed HTML')
          throw new Error(resolveCustomErrorMessage(errorMessage, defaultErrorMessage, pick(context, ['_', '__'])))
        }
      }
    }
  }
}
