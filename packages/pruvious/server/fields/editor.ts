import {
  type CombinedFieldOptions,
  defineField,
  type GenericDatabase,
  type ResolveFieldUIOptions,
  type TranslatableStringCallbackContext,
} from '#pruvious/server'
import {
  type ConditionalLogic,
  type Field,
  type FieldModel,
  textFieldModel,
  type TextFieldModelOptions,
} from '@pruvious/orm'
import { isNull, isObject, isRelURL, isString, normalizeWhitespace } from '@pruvious/utils'
import type { PropType } from 'vue'
import type { LinksOptions, Mark, ToolbarGroup } from './richText'

/**
 * Built-in block types supported by the editor field.
 *
 * - `paragraph` - `<p>` block.
 * - `h1`..`h6` - heading levels.
 * - `bulletList` - `<ul>` with `<li>` items.
 * - `orderedList` - `<ol>` with `<li>` items.
 * - `blockquote` - `<blockquote>` block.
 * - `codeBlock` - `<pre><code>` block.
 * - `hr` - `<hr>` divider.
 */
export type EditorBlockKey =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'codeBlock'
  | 'hr'

export const EDITOR_BLOCK_KEYS: readonly EditorBlockKey[] = [
  'paragraph',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'bulletList',
  'orderedList',
  'blockquote',
  'codeBlock',
  'hr',
] as const

/**
 * Maps editor block keys to the HTML tags they produce.
 * Used by the validator to build the allowed-tag set.
 */
const BLOCK_KEY_TAGS: Record<EditorBlockKey, string[]> = {
  paragraph: ['p'],
  h1: ['h1'],
  h2: ['h2'],
  h3: ['h3'],
  h4: ['h4'],
  h5: ['h5'],
  h6: ['h6'],
  bulletList: ['ul', 'li'],
  orderedList: ['ol', 'li'],
  blockquote: ['blockquote'],
  codeBlock: ['pre', 'code'],
  hr: ['hr'],
}

export type EditorStandardToolbarItem = 'blockType' | 'clearFormatting' | 'link' | 'undo' | 'redo' | '|'

export interface EditorCustomOptions<TMark extends string = never> {
  /**
   * Built-in block types the user can insert.
   * Defaults to every supported block (`paragraph`, `h1`-`h6`, `bulletList`, `orderedList`, `blockquote`, `codeBlock`, `hr`).
   *
   * The first entry in the array is used as the default block type for an empty editor.
   *
   * @default
   * ['paragraph', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'bulletList', 'orderedList', 'blockquote', 'codeBlock', 'hr']
   *
   * @example
   * ```ts
   * editorField({ blocks: ['paragraph', 'h2', 'h3', 'bulletList'] })
   * ```
   */
  blocks?: EditorBlockKey[]

  /**
   * Controls whether to normalize whitespace in the HTML content.
   * When enabled, consecutive whitespace characters will be collapsed into a single space,
   * and leading/trailing whitespace will be trimmed.
   *
   * @default true
   *
   * @example
   * ```ts
   * ' <strong> Hello, </strong>World! '  //=> '<strong>Hello,</strong> World!'
   * ' <strong> Hello </strong>, World! ' //=> '<strong>Hello</strong> , World!'
   * ```
   */
  normalizeWhitespace?: boolean

  /**
   * Marks that can be used inside block content.
   *
   * Marks apply inline formatting like bold, italic, or links to text.
   * Each mark has a tag name, optional parse tags, attributes, keyboard shortcut, icon, and label.
   *
   * The keys in the `marks` object are identifiers you can reference in toolbar configs.
   *
   * @default {}
   *
   * @example
   * ```ts
   * marks: {
   *   myCustomMark: {
   *     tag: 'span',
   *     attrs: { class: 'my-custom-mark' },
   *     shortcut: 'Mod-e',
   *     icon: 'star',
   *     label: ({ __ }) => __('pruvious-dashboard', 'My custom mark'),
   *   },
   * }
   * ```
   */
  marks?: Record<TMark, Mark>

  /**
   * Controls whether hyperlinks (`<a>` tags) are allowed inside the editor content.
   *
   * - `true` (default) - Links are enabled with default options.
   *   The toolbar's `auto` mode includes a link button and `Mod-k` opens the picker.
   * - An object - Links are enabled with the specified restrictions.
   * - `false` - Links are disabled. The link mark is removed from the schema and the toolbar.
   *
   * Internal links use the `rel://` protocol (e.g. `rel://Routes:1/Articles:5@en`) and are resolved
   * to real URL paths when the field value is populated.
   *
   * @default true
   *
   * @example
   * ```ts
   * // Disable links entirely
   * editorField({ links: false })
   *
   * // Restrict to specific kinds of internal links and disallow external URLs
   * editorField({
   *   links: {
   *     allowExternal: false,
   *     allowedReferences: ['Articles', 'Pages'],
   *   },
   * })
   * ```
   */
  links?: boolean | LinksOptions

  ui?: {
    /**
     * The placeholder text to display when the editor is empty (single empty paragraph).
     *
     * You can either provide a string or a function that returns a string.
     * The function receives an object with `_` and `__` properties to access the translation functions.
     *
     * @default ''
     *
     * @example
     * ```ts
     * // String (non-translatable)
     * placeholder: 'Start typing...'
     *
     * // Function (translatable)
     * placeholder: ({ __ }) => __('pruvious-dashboard', 'Start typing...')
     * ```
     */
    placeholder?: string | ((context: TranslatableStringCallbackContext) => string)

    /**
     * The toolbar configuration for the editor.
     *
     * - `'auto'` (default) - Shows the block-type dropdown, separator, all configured marks,
     *   link (if enabled), separator, clear formatting, separator, undo, redo.
     * - `false` - Toolbar hidden.
     * - An array - Custom layout of toolbar items, groups, and separators.
     *
     * Toolbar items:
     *
     * - `'blockType'` - Block-type dropdown (hidden when fewer than two blocks are allowed).
     * - `'mark:<name>'` - A configured mark.
     * - `'link'` - Link button (requires `links` enabled).
     * - `'clearFormatting'` - Strip inline marks from selection.
     * - `'undo'` / `'redo'` - History controls.
     * - `'|'` - Vertical separator.
     * - A `ToolbarGroup` object - Renders a button that opens a dropdown with the listed items.
     *
     * @default 'auto'
     *
     * @example
     * ```ts
     * toolbar: [
     *   // Block-type dropdown
     *   'blockType',
     *
     *   '|',
     *
     *   // Mark identifier (e.g. 'mark:bold' for the mark with the key 'bold')
     *   'mark:bold',
     *   'mark:italic',
     *
     *   // Group with custom icon, tooltip, and items (displayed as a dropdown in the toolbar)
     *   {
     *     icon: 'typography',
     *     tooltip: ({ __ }) => __('pruvious-dashboard', 'More formats'),
     *     items: ['mark:underline', 'mark:strikethrough', 'mark:code'],
     *   },
     *
     *   '|',
     *
     *   // Standard toolbar items
     *   'link',
     *   'clearFormatting',
     *   'undo',
     *   'redo',
     * ]
     * ```
     */
    toolbar?:
      | 'auto'
      | false
      | (
          | NoInfer<`mark:${TMark}`>
          | EditorStandardToolbarItem
          | ToolbarGroup<NoInfer<`mark:${TMark}`> | EditorStandardToolbarItem>
        )[]

    /**
     * Data table column display options.
     *
     * @default
     * {
     *   hyphenate: true,
     *   truncate: { lines: 1 },
     * }
     *
     * @example
     * ```ts
     * dataTable: { hyphenate: false, truncate: { lines: 2 } }
     * ```
     */
    dataTable?: {
      /**
       * Controls whether long words should be hyphenated to fit in the cell.
       * When `true`, long words will be broken with hyphens to prevent overflow.
       *
       * @default true
       */
      hyphenate?: boolean

      /**
       * Controls how content is truncated when it exceeds the available space.
       * You can limit by characters, lines, or words.
       *
       * @default
       * { lines: 1 }
       *
       * @example
       * ```ts
       * truncate: { characters: 80 }
       * truncate: { lines: 2 }
       * truncate: { words: 20 }
       * ```
       */
      truncate?:
        | {
            /**
             * Maximum number of characters to display before truncating.
             * Content exceeding this limit will be cut off with an ellipsis.
             */
            characters: number
          }
        | {
            /**
             * Maximum number of lines to display before truncating.
             * Content exceeding this limit will be cut off with an ellipsis.
             */
            lines: number
          }
        | {
            /**
             * Maximum number of words to display before truncating.
             * Content exceeding this limit will be cut off with an ellipsis.
             */
            words: number
          }
    }
  }
}

const customOptions: EditorCustomOptions<string> = {
  blocks: [...EDITOR_BLOCK_KEYS],
  normalizeWhitespace: true,
  marks: {},
  links: true,
  ui: {
    dataTable: {
      hyphenate: true,
      truncate: { lines: 1 },
    },
    toolbar: 'auto',
  },
}

function buildAllowedBlockTags(blocks: EditorBlockKey[] | undefined): Set<string> {
  const tags = new Set<string>()
  const keys: EditorBlockKey[] = blocks && blocks.length > 0 ? blocks : [...EDITOR_BLOCK_KEYS]

  for (const key of keys) {
    for (const tag of BLOCK_KEY_TAGS[key] ?? []) {
      tags.add(tag)
    }
  }

  return tags
}

function parseAttrsString(attrsStr: string): Record<string, string> {
  const attrRegex = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/g
  const attrs: Record<string, string> = {}
  let match: RegExpExecArray | null

  while ((match = attrRegex.exec(attrsStr)) !== null) {
    attrs[match[1]!.toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? ''
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

function matchesSpanAttrs(parsed: Record<string, string>, expected: Record<string, string>): boolean {
  const expectedKeys = Object.keys(expected)
  const actualKeys = Object.keys(parsed)

  if (actualKeys.length !== expectedKeys.length) {
    return false
  }

  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = parsed[key]

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

export default {
  /**
   * Creates a new `Field` instance.
   *
   * This function is intended for server-side use in collection definitions.
   * For client-side usage, import the equivalent function from `#pruvious/app`.
   */
  serverFn: function <
    const TRequired extends boolean | undefined,
    const TImmutable extends boolean | undefined,
    const TAutoGenerated extends boolean | undefined,
    TConditionalLogic extends ConditionalLogic | undefined,
    TMark extends string = never,
  >(
    options: CombinedFieldOptions<
      FieldModel<TextFieldModelOptions<string, string>, 'text', string, string, undefined, undefined, undefined>,
      TextFieldModelOptions<string, string> & EditorCustomOptions<TMark> & ResolveFieldUIOptions<{ placeholder: true }>,
      false,
      TRequired,
      TImmutable,
      TAutoGenerated,
      TConditionalLogic,
      GenericDatabase
    >,
  ): Field<
    FieldModel<TextFieldModelOptions<string, string>, 'text', string, string, undefined, undefined, undefined>,
    TextFieldModelOptions<string, string> & EditorCustomOptions<TMark> & ResolveFieldUIOptions<{ placeholder: true }>,
    false,
    TRequired,
    TImmutable,
    TAutoGenerated,
    TConditionalLogic,
    GenericDatabase
  > {
    const bound = defineField({
      model: textFieldModel(),
      customOptions,
      uiOptions: { placeholder: true },
      populator: async (value, { definition }) => {
        if (!definition.options.links || !isString(value) || !value || !value.includes('rel://')) {
          return value
        }

        const { populateRelURL } = await import('#pruvious/server')
        const tagRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
        const matches: { start: number; end: number; attrs: string; inner: string }[] = []
        let match: RegExpExecArray | null

        while ((match = tagRegex.exec(value)) !== null) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            attrs: match[1] ?? '',
            inner: match[2] ?? '',
          })
        }

        let result = value

        for (let i = matches.length - 1; i >= 0; i--) {
          const { start, end, attrs, inner } = matches[i]!
          const hrefMatch = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs)

          if (!hrefMatch) {
            continue
          }

          const href = hrefMatch[1] ?? hrefMatch[2] ?? ''

          if (!isRelURL(href)) {
            continue
          }

          const resolved = await populateRelURL(href)

          if (isNull(resolved)) {
            result = result.slice(0, start) + inner + result.slice(end)
          } else {
            const escaped = resolved
              .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi, '&amp;')
              .replace(/"/g, '&quot;')
            const newAttrs = attrs.replace(/\bhref\s*=\s*(?:"[^"]*"|'[^']*')/i, `href="${escaped}"`)
            result = result.slice(0, start) + `<a${newAttrs}>${inner}</a>` + result.slice(end)
          }
        }

        return result
      },
      sanitizers: [
        (value, { definition }) =>
          isString(value) && definition.options.normalizeWhitespace ? normalizeWhitespace(value) : value,
      ],
      validators: [
        (value, sanitizedContextField) => {
          if (isNull(value)) {
            return
          }

          const { context, definition } = sanitizedContextField

          if (!isString(value)) {
            throw new Error(context.__('pruvious-orm', 'The rich text content must be a string'))
          }

          const blockTags = buildAllowedBlockTags(definition.options.blocks)
          const marks: Record<string, { tag?: string; parseTags?: string[]; attrs?: any }> =
            definition.options.marks ?? {}
          const linksEnabled = !!definition.options.links
          const allowedTags = new Set<string>(blockTags)
          const spanAttrsConfigs: Record<string, string>[] = []
          const allowedLinkAttrs = new Set(['href', 'target', 'rel'])

          for (const mark of Object.values(marks)) {
            const tag = mark.tag ?? 'span'
            allowedTags.add(tag)

            for (const parseTag of mark.parseTags ?? []) {
              allowedTags.add(parseTag)
            }

            if (tag === 'span') {
              if (mark.attrs) {
                const resolved = resolveExpectedAttrs(mark.attrs)

                if (resolved) {
                  spanAttrsConfigs.push(resolved)
                }
              } else {
                spanAttrsConfigs.push({})
              }
            }
          }

          if (linksEnabled) {
            allowedTags.add('a')
          }

          const htmlTagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)?\/?>/g
          let match: RegExpExecArray | null
          let anchorDepth = 0
          let listDepth = 0

          while ((match = htmlTagRegex.exec(value)) !== null) {
            const tagName = match[1]!.toLowerCase()
            const attrsStr = match[2] ?? ''
            const isClosing = match[0].startsWith('</')
            const isSelfClosing = !isClosing && match[0].endsWith('/>')

            if (!allowedTags.has(tagName)) {
              throw new Error(context.__('pruvious-orm', 'The HTML tag `<$tag>` is not allowed', { tag: tagName }))
            }

            if (tagName === 'a') {
              if (isClosing) {
                if (anchorDepth === 0) {
                  throw new Error(context.__('pruvious-orm', 'The `<a>` element is malformed'))
                }
                anchorDepth--
              } else if (isSelfClosing || anchorDepth > 0) {
                throw new Error(context.__('pruvious-orm', 'The `<a>` element is malformed'))
              } else {
                anchorDepth++
              }
            }

            if (tagName === 'ul' || tagName === 'ol') {
              if (isClosing) {
                if (listDepth === 0) {
                  throw new Error(context.__('pruvious-orm', 'The HTML tag `<$tag>` is not allowed', { tag: tagName }))
                }
                listDepth--
              } else if (!isSelfClosing) {
                listDepth++
              }
            } else if (tagName === 'li' && !isClosing && listDepth === 0) {
              throw new Error(context.__('pruvious-orm', 'The HTML tag `<$tag>` is not allowed', { tag: tagName }))
            }

            if (!isClosing) {
              if (tagName === 'span') {
                const parsedAttrs = parseAttrsString(attrsStr)
                const matchesAny = spanAttrsConfigs.some((expected) => matchesSpanAttrs(parsedAttrs, expected))

                if (!matchesAny) {
                  throw new Error(context.__('pruvious-orm', 'The `<span>` element has disallowed attributes'))
                }
              } else if (tagName === 'a' && linksEnabled) {
                const parsedAttrs = parseAttrsString(attrsStr)

                if (!parsedAttrs.href) {
                  throw new Error(context.__('pruvious-orm', 'The `<a>` element is missing the `href` attribute'))
                }

                for (const key of Object.keys(parsedAttrs)) {
                  if (!allowedLinkAttrs.has(key)) {
                    throw new Error(
                      context.__('pruvious-orm', 'The `<a>` attribute `$attr` is not allowed', { attr: key }),
                    )
                  }
                }
              } else if (tagName !== 'span' && blockTags.has(tagName)) {
                // Block tags cannot carry attributes in the editor field.
                if (attrsStr.trim()) {
                  throw new Error(
                    context.__('pruvious-orm', 'The HTML tag `<$tag>` cannot have attributes', { tag: tagName }),
                  )
                }
              } else if (tagName !== 'span' && attrsStr.trim()) {
                throw new Error(
                  context.__('pruvious-orm', 'The HTML tag `<$tag>` cannot have attributes', { tag: tagName }),
                )
              }
            }
          }

          if (anchorDepth !== 0) {
            throw new Error(context.__('pruvious-orm', 'The `<a>` element is malformed'))
          }

          if (listDepth !== 0) {
            throw new Error(context.__('pruvious-orm', 'The HTML tag `<$tag>` is not allowed', { tag: 'li' }))
          }
        },
        async (value, sanitizedContextField) => {
          const { context, definition } = sanitizedContextField
          const linksOption = definition.options.links

          if (!linksOption || !isString(value) || !value) {
            return
          }

          const linkOptions: LinksOptions = isObject(linksOption) ? linksOption : {}
          const { validateLinkUrl, isValidRelValue, VALID_LINK_TARGETS } = await import('./link')
          const anchorRegex = /<a\b([^>]*)>/gi
          const attrRegex = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/g
          let match: RegExpExecArray | null

          while ((match = anchorRegex.exec(value)) !== null) {
            const attrsStr = match[1] ?? ''
            const attrs: Record<string, string> = {}
            let attrMatch: RegExpExecArray | null

            while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
              attrs[attrMatch[1]!.toLowerCase()] = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? ''
            }

            const href = (attrs.href ?? '').trim()

            if (!href) {
              throw new Error(context.__('pruvious-api' as any, 'This link is not formatted correctly' as any))
            }

            const hrefError = await validateLinkUrl(href, linkOptions, context)

            if (hrefError) {
              throw new Error(hrefError)
            }

            if (attrs.target && !VALID_LINK_TARGETS.includes(attrs.target)) {
              throw new Error(context.__('pruvious-api' as any, 'Invalid link target' as any))
            }

            if (attrs.rel && !isValidRelValue(attrs.rel)) {
              throw new Error(context.__('pruvious-api' as any, 'The `rel` value contains invalid characters' as any))
            }
          }
        },
      ],
    }).serverFn.bind(this)
    return bound(options as any) as any
  },

  /**
   * Creates a new `Field` instance.
   *
   * This function is intended for client-side use in Vue components.
   * For server-side usage, import the equivalent function from `#pruvious/server`.
   */
  clientFn: function <
    const TRequired extends boolean | undefined,
    const TImmutable extends boolean | undefined,
    const TAutoGenerated extends boolean | undefined,
    TConditionalLogic extends ConditionalLogic | undefined,
    TMark extends string = never,
  >(
    options: CombinedFieldOptions<
      FieldModel<TextFieldModelOptions<string, string>, 'text', string, string, undefined, undefined, undefined>,
      TextFieldModelOptions<string, string> & EditorCustomOptions<TMark> & ResolveFieldUIOptions<{ placeholder: true }>,
      false,
      TRequired,
      TImmutable,
      TAutoGenerated,
      TConditionalLogic,
      GenericDatabase
    >,
  ): { type: PropType<string>; required: true } & {
    field: Field<
      FieldModel<TextFieldModelOptions<string, string>, 'text', string, string, undefined, undefined, undefined>,
      TextFieldModelOptions<string, string> & EditorCustomOptions<TMark> & ResolveFieldUIOptions<{ placeholder: true }>,
      false,
      TRequired,
      TImmutable,
      TAutoGenerated,
      TConditionalLogic,
      GenericDatabase
    >
  } {
    return null as any
  },

  /**
   * Represents the type structure for this field's configuration options.
   *
   * Note: This is a TypeScript type assertion and does not involve any runtime logic or data.
   */
  TOptions: undefined as unknown as CombinedFieldOptions<
    FieldModel<
      TextFieldModelOptions<Record<string, any>, Record<string, any>>,
      'text',
      string,
      string,
      string,
      undefined,
      undefined
    >,
    TextFieldModelOptions<Record<string, any>, Record<string, any>> &
      EditorCustomOptions<string> &
      ResolveFieldUIOptions<{ placeholder: true }>,
    boolean,
    boolean,
    boolean,
    boolean,
    ConditionalLogic | undefined,
    GenericDatabase
  >,
}
