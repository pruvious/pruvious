import { isNull, isObject, isString, pick } from '@pruvious/utils'
import type { GenericDatabase, GenericValidator } from '../core'
import type { CustomErrorMessage } from './types'
import { resolveCustomErrorMessage } from './utils'

function parseAttrsString(attrsStr: string): Record<string, string> {
  const attrRegex = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/g
  const attrs: Record<string, string> = {}
  let match: RegExpExecArray | null

  while ((match = attrRegex.exec(attrsStr)) !== null) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? ''
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
 * - Reads `marks`, `allowLineBreaks`, and `links` from the field's `definition.options`.
 * - Parses all HTML tags from the value and checks them against the configured marks.
 * - Rejects content with tags that are not in the allowed marks list.
 * - For `<span>` marks with attributes, validates that the attributes match.
 * - Validates `<br>` tags against the `allowLineBreaks` option.
 * - When `links` is truthy, allows `<a>` tags carrying only `href`, `target`, and `rel` attributes.
 *   Deeper href validation (e.g. `rel://` shape, allowed references) is performed by the field's own validator.
 * - Skips validation when value is `null`.
 * - Throws an error if the validation fails. The default message names the offending tag or attribute
 *   (e.g. ``The HTML tag `<img>` is not allowed``).
 * - A custom `errorMessage` can be provided as a parameter to override every specific default.
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

    const i18nCtx = pick(context, ['_', '__'])
    const fail = (defaultMsg: string): never => {
      throw new Error(resolveCustomErrorMessage(errorMessage, defaultMsg, i18nCtx))
    }

    if (!isString(value)) {
      fail(context.__('pruvious-orm', 'The rich text content must be a string'))
    }

    const marks: Record<string, { tag?: string; parseTags?: string[]; attrs?: any }> = definition.options.marks ?? {}
    const allowLineBreaks: boolean = definition.options.allowLineBreaks !== false
    const linksEnabled: boolean = !!definition.options.links
    const allowedTags = new Set<string>()
    const spanAttrsConfigs: Record<string, string>[] = []
    const allowedLinkAttrs = new Set(['href', 'target', 'rel'])

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

    if (linksEnabled) {
      allowedTags.add('a')
    }

    const htmlTagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)?\/?>/g
    let match: RegExpExecArray | null
    let anchorDepth = 0

    while ((match = htmlTagRegex.exec(value)) !== null) {
      const tagName = match[1].toLowerCase()
      const attrsStr = match[2] ?? ''
      const isClosing = match[0].startsWith('</')
      const isSelfClosing = !isClosing && match[0].endsWith('/>')

      if (!allowedTags.has(tagName)) {
        fail(context.__('pruvious-orm', 'The HTML tag `<$tag>` is not allowed', { tag: tagName }))
      }

      if (tagName === 'a') {
        if (isClosing) {
          if (anchorDepth === 0) {
            fail(context.__('pruvious-orm', 'The `<a>` element is malformed'))
          }
          anchorDepth--
        } else if (isSelfClosing || anchorDepth > 0) {
          fail(context.__('pruvious-orm', 'The `<a>` element is malformed'))
        } else {
          anchorDepth++
        }
      }

      if (!isClosing) {
        if (tagName === 'span' && spanAttrsConfigs.length > 0) {
          const parsedAttrs = parseAttrsString(attrsStr)
          const matchesAny = spanAttrsConfigs.some((expected) => matchesSpanAttrs(parsedAttrs, expected))

          if (!matchesAny) {
            fail(context.__('pruvious-orm', 'The `<span>` element has disallowed attributes'))
          }
        } else if (tagName === 'a' && linksEnabled) {
          const parsedAttrs = parseAttrsString(attrsStr)
          const attrKeys = Object.keys(parsedAttrs)

          if (!parsedAttrs.href) {
            fail(context.__('pruvious-orm', 'The `<a>` element is missing the `href` attribute'))
          }

          for (const key of attrKeys) {
            if (!allowedLinkAttrs.has(key)) {
              fail(context.__('pruvious-orm', 'The `<a>` attribute `$attr` is not allowed', { attr: key }))
            }
          }
        } else if (tagName !== 'span' && attrsStr.trim()) {
          fail(context.__('pruvious-orm', 'The HTML tag `<$tag>` cannot have attributes', { tag: tagName }))
        }
      }
    }

    if (anchorDepth !== 0) {
      fail(context.__('pruvious-orm', 'The `<a>` element is malformed'))
    }
  }
}
