import { isString } from '../string/is'

/**
 * Result of a sanitization pass.
 */
export interface SanitizeSvgResult {
  /**
   * The sanitized SVG string. Empty if the input did not contain an `<svg>` element.
   */
  svg: string

  /**
   * Names of dangerous constructs that were stripped (e.g. `'script'`, `'on*'`, `'foreignObject'`).
   * Useful for logging or surfacing back to the user.
   */
  removed: string[]
}

/**
 * `<script>` runs JavaScript, `<foreignObject>` can host arbitrary HTML,
 * and SMIL animation elements can carry event handlers.
 */
const FORBIDDEN_ELEMENTS = [
  'script',
  'foreignobject',
  'handler',
  'listener',
  'set',
  'animate',
  'animatetransform',
  'animatemotion',
  'animatecolor',
  'discard',
  'cursor',
]

const URL_ATTRIBUTES = new Set([
  'href',
  'xlink:href',
  'src',
  'srcset',
  'action',
  'formaction',
  'background',
  'poster',
  'data',
  'codebase',
])

/**
 * SVG presentation attributes that accept `url(#id)` references. We allow
 * in-document fragments but block anything that would resolve to an external
 * resource (defended via `containsDangerousCss`).
 */
const URL_REF_ATTRIBUTES = new Set([
  'filter',
  'mask',
  'clip-path',
  'fill',
  'stroke',
  'marker-start',
  'marker-mid',
  'marker-end',
  'cursor',
])

const DANGEROUS_URI_SCHEMES = /^\s*(?:javascript|vbscript|livescript|mocha|data|blob|file|jar):/i

/**
 * Detects whether a `Buffer` or string looks like an SVG document.
 *
 * Reads up to 16 KiB so SVGs with long XML prologues, DOCTYPE blocks, or
 * leading comments are still recognized. Avoids parsing huge binary blobs.
 */
export function isSvgBuffer(input: Buffer | Uint8Array | string): boolean {
  const limit = 16 * 1024
  let head: string

  if (isString(input)) {
    head = input.slice(0, limit)
  } else if (Buffer.isBuffer(input)) {
    head = input.subarray(0, limit).toString('utf-8')
  } else {
    head = Buffer.from(input.subarray(0, limit)).toString('utf-8')
  }

  return /<svg[\s/>]/i.test(head)
}

/**
 * Sanitizes an SVG string by removing constructs that can lead to XSS or
 * data exfiltration when the SVG is served from the same origin.
 *
 * The sanitizer is intentionally aggressive - it strips anything that has ever
 * been used as an SVG attack vector even if a particular renderer would not
 * execute it, on the assumption that user-uploaded SVGs do not need scripting,
 * animations that fire events, or references to remote resources.
 *
 * Removed:
 * - `<script>`, `<foreignObject>`, `<handler>`, `<listener>`, SMIL animation
 *   elements that can carry event handlers.
 * - All `on*` event handler attributes (`onload`, `onclick`, ...).
 * - URL attributes (`href`, `xlink:href`, `src`, ...) using `javascript:`,
 *   `vbscript:`, `data:` (except `data:image/...`), `blob:`, `file:`, `jar:`,
 *   or external `http(s)://` targets.
 * - `<style>` elements and `style="..."` attributes containing `expression(`,
 *   `behavior:`, `-moz-binding:`, `@import`, or `url(...)` references that
 *   resolve outside the document.
 * - XML processing instructions (`<?xml-stylesheet ...?>`) and `<!DOCTYPE ...>`
 *   declarations (entity expansion / XXE surface).
 * - HTML/XML comments (defence against comment-smuggled markup).
 *
 * @param input - The raw SVG markup as a string, `Buffer`, or `Uint8Array`.
 *
 * @returns The sanitized SVG and a list of removed construct names.
 *
 * @example
 * ```ts
 * const { svg, removed } = sanitizeSvg(`<svg onload="alert(1)"><script>x</script></svg>`)
 * // svg     = '<svg></svg>'
 * // removed = ['script', 'on*']
 * ```
 */
export function sanitizeSvg(input: string | Buffer | Uint8Array): SanitizeSvgResult {
  let svg: string

  if (isString(input)) {
    svg = input
  } else if (Buffer.isBuffer(input)) {
    svg = input.toString('utf-8')
  } else {
    svg = Buffer.from(input).toString('utf-8')
  }

  const removed = new Set<string>()

  svg = svg.replace(/^﻿/, '').trim()

  const svgOpenIndex = svg.search(/<svg[\s/>]/i)
  if (svgOpenIndex === -1) {
    return { svg: '', removed: [] }
  }

  // Drop everything before <svg> to neutralize XXE and stylesheet PI attacks.
  if (svgOpenIndex > 0) {
    const prologue = svg.slice(0, svgOpenIndex)
    if (/<\?xml-stylesheet/i.test(prologue)) {
      removed.add('xml-stylesheet')
    }
    if (/<!DOCTYPE/i.test(prologue)) {
      removed.add('doctype')
    }
    if (/<!ENTITY/i.test(prologue)) {
      removed.add('entity')
    }
    svg = svg.slice(svgOpenIndex)
  }

  // Drop trailing markup after </svg> (e.g. appended <script> tags).
  const svgCloseMatch = svg.match(/<\/svg\s*>/i)
  if (svgCloseMatch && svgCloseMatch.index !== undefined) {
    svg = svg.slice(0, svgCloseMatch.index + svgCloseMatch[0].length)
  }

  // Comments can smuggle markup that some parsers re-interpret post-sanitization.
  if (/<!--/.test(svg)) {
    svg = svg.replace(/<!--[\s\S]*?-->/g, '')
    removed.add('comment')
  }

  // Unwrap CDATA so its contents are sanitized as markup.
  svg = svg.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, inner) => {
    removed.add('cdata')
    return inner
  })

  // `(?:[\w-]+:)?` strips namespaced variants like `<xhtml:script>` too.
  for (const tag of FORBIDDEN_ELEMENTS) {
    const paired = new RegExp(`<\\s*(?:[\\w-]+:)?${tag}\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*(?:[\\w-]+:)?${tag}\\s*>`, 'gi')
    const selfClose = new RegExp(`<\\s*(?:[\\w-]+:)?${tag}\\b[^>]*\\/?>`, 'gi')
    if (paired.test(svg) || selfClose.test(svg)) {
      removed.add(tag)
      svg = svg.replace(paired, '').replace(selfClose, '')
    }
  }

  svg = svg.replace(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi, (match, css: string) => {
    if (containsDangerousCss(css)) {
      removed.add('style')
      return ''
    }
    return match
  })

  svg = svg.replace(/<([a-zA-Z][\w:-]*)([^>]*)>/g, (match, tagName: string, attrs: string) => {
    const cleaned = scrubAttributes(attrs, removed)
    return `<${tagName}${cleaned}>`
  })

  return { svg, removed: [...removed].sort() }
}

function containsDangerousCss(css: string): boolean {
  if (/expression\s*\(/i.test(css)) return true
  if (/behavior\s*:/i.test(css)) return true
  if (/-moz-binding\s*:/i.test(css)) return true
  if (/@import\b/i.test(css)) return true
  if (/url\s*\(\s*(?!['"]?(?:#|data:image\/))/i.test(css)) return true
  return false
}

function scrubAttributes(attrs: string, removed: Set<string>): string {
  if (!attrs.trim()) {
    return attrs
  }

  const attrRegex = /\s+([a-zA-Z_:][\w:.\-]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>`]+))?/g
  let result = ''
  let match: RegExpExecArray | null

  while ((match = attrRegex.exec(attrs)) !== null) {
    const name = match[1]!
    const rawValue = match[2]
    const value = unquoteAttrValue(rawValue)
    const lowerName = name.toLowerCase()

    if (lowerName.startsWith('on')) {
      removed.add('on*')
      continue
    }

    if (lowerName === 'style') {
      if (containsDangerousCss(value)) {
        removed.add('style-attr')
        continue
      }
    }

    if (URL_ATTRIBUTES.has(lowerName) || lowerName.endsWith(':href')) {
      if (!isSafeUrl(value)) {
        removed.add(lowerName)
        continue
      }
    }

    if (URL_REF_ATTRIBUTES.has(lowerName) && containsDangerousCss(value)) {
      removed.add(lowerName)
      continue
    }

    result += rawValue === undefined ? ` ${name}` : ` ${name}=${rawValue}`
  }

  // Preserve a trailing `/` so self-closing tags stay self-closing.
  if (/\/\s*$/.test(attrs)) {
    result += '/'
  }

  return result
}

/**
 * Decodes HTML entities so obfuscated schemes (e.g. `&#106;avascript:`) still
 * trip the dangerous-scheme check.
 */
function unquoteAttrValue(raw: string | undefined): string {
  if (raw === undefined) return ''
  let value = raw
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&(amp|lt|gt|quot|apos|colon|tab|newline);/gi, (_, name) => {
      const map: Record<string, string> = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        colon: ':',
        tab: '\t',
        newline: '\n',
      }
      return map[name.toLowerCase()] ?? ''
    })
}

/**
 * Allows empty values, in-document fragments (`#id`), and `data:image/...`
 * URIs except nested SVGs (which would re-introduce the attack surface).
 */
function isSafeUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  if (trimmed.startsWith('#')) return true
  if (/^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/i.test(trimmed)) {
    return !/^data:image\/svg\+xml/i.test(trimmed)
  }
  if (DANGEROUS_URI_SCHEMES.test(trimmed)) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false
  return true
}
