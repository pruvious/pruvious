import {
  type BlockName,
  type CombinedFieldOptions,
  defineField,
  type DynamicBlockFieldTypes,
  type GenericDatabase,
  type LanguageCode,
  type ResolveFieldUIOptions,
  type RouteCollectionReferenceName,
  type TranslatableStringCallbackContext,
} from '#pruvious/server'
import type { icons } from '@iconify-json/tabler/icons.json'
import {
  type ConditionalLogic,
  type Field,
  type FieldModel,
  textFieldModel,
  type TextFieldModelOptions,
} from '@pruvious/orm'
import { isNull, isObject, isRelURL, isString, normalizeWhitespace } from '@pruvious/utils'
import type { CSSProperties, PropType } from 'vue'

export interface RichTextCustomOptions<TMark extends string = never> {
  /**
   * Controls whether to allow line breaks in the content.
   *
   * @default true
   */
  allowLineBreaks?: boolean

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
   * Marks that can be used in rich text content.
   *
   * Marks apply inline formatting like bold, italic, or links to text.
   * Each mark has a tag name, optional parse tags, attributes, keyboard shortcut, icon, and label.
   *
   * The keys in the `marks` object are identifiers you can reference in toolbar configs and formatting functions.
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
   * Controls whether hyperlinks (`<a>` tags) are allowed inside the rich text content.
   *
   * - `true` (default) - Links are enabled with default options.
   *   The toolbar's `'auto'` mode includes a link button and `Mod-k` opens the picker.
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
   * richTextField({ links: false })
   *
   * // Restrict to specific kinds of internal links and disallow external URLs
   * richTextField({
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
     * @default
     * {
     *   hyphenate: true,
     *   truncate: { lines: 1 },
     * }
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

    /**
     * Additional options for the rich text editor in the live preview.
     *
     * @default
     * {
     *   deleteBlockWhenEmpty: false,
     *   formatters: [],
     *   forwardSlashOpensBlockPicker: true,
     *   mergeGroups: [],
     * }
     */
    liveEditor?: {
      /**
       * Removes the parent block when the field is empty and the user presses Delete or Backspace.
       *
       * @default false
       */
      deleteBlockWhenEmpty?: boolean

      /**
       * Functions that automatically change the block type or props based on what the user types.
       * Each function receives the new and old field values (HTML and raw text), and can return an object with:
       *
       * - `$key`: The block type to change to (required)
       * - Any other props to update on the block
       *
       * @default []
       *
       * @example
       * ```ts
       * formatters: [
       *   ({ newText }) => {
       *     if (newText === '---') {
       *       return { $key: 'Divider' }
       *     }
       *   },
       *   ({ newHTML, newText, oldText }) => {
       *     if (newText.startsWith('# ') && !oldText.startsWith('# ')) {
       *       return { $key: 'ProseNode', tag: 'h1', text: newHTML.replace('# ', '') }
       *     }
       *   },
       * ],
       * ```
       */
      formatters?: RichTextFormatter[]

      /**
       * Opens the block picker when pressing `/` in the editor.
       *
       * When enabled, you can press the forward slash key to open a popup that
       * lets you replace the current block with another block.
       * Works only if there are at least 2 allowed blocks for the current block.
       *
       * @default true
       */
      forwardSlashOpensBlockPicker?: boolean

      /**
       * Enable merging content with nearby rich text fields.
       * When enabled, users can merge fields by pressing:
       *
       * - Backspace at the start of the content.
       * - Delete at the end of the content.
       *
       * Fields can only merge if they share at least one group.
       *
       * @default []
       */
      mergeGroups?: string[]

      /**
       * The toolbar configuration for the rich text editor.
       * You can set the following values:
       *
       * - `'auto'` (default) - The toolbar will automatically show available marks
       *   based on the field's `marks` option and standard items.
       * - `false` - The toolbar will be hidden and no formatting options will be available.
       * - An array of mark identifiers, standard toolbar items, or custom groups to show in the toolbar.
       *
       * @default 'auto'
       *
       * @example
       * ```ts
       * toolbar: [
       *   // Mark identifier (e.g. 'mark:bold' for the mark with the key 'bold')
       *   'mark:myCustomMark',
       *
       *   // Group with custom icon, tooltip, and items (displayed as a dropdown in the toolbar)
       *   {
       *     icon: 'typography',
       *     tooltip: ({ __ }) => __('pruvious-dashboard', 'Formats'),
       *     items: ['mark:bold', 'mark:italic', 'mark:underline'],
       *   },
       *
       *   // Standard toolbar items
       *   'clearFormatting',
       * ]
       * ```
       */
      toolbar?:
        | 'auto'
        | false
        | (
            | NoInfer<`mark:${TMark}`>
            | StandardToolbarItem
            | ToolbarGroup<NoInfer<`mark:${TMark}`> | StandardToolbarItem>
          )[]
    }
  }
}

export interface Mark {
  /**
   * The HTML tag name to use for this mark.
   *
   * @default 'span'
   */
  tag?: 'code' | 'em' | 'small' | 'strong' | 'sub' | 'sup' | 'underline' | (string & {})

  /**
   * An array of HTML tag names that should be parsed as this mark when converting from HTML to the editor's internal format.
   *
   * This allows you to treat multiple tags as the same mark.
   * For example, you could use `['i']` to parse `<i>` tags and convert them to the same mark as `<em>` tags.
   *
   * @default []
   */
  parseTags?: string[]

  /**
   * Attributes to add to the mark's HTML element.
   *
   * This can be used to add classes, styles, or any other attributes to the mark's element.
   * For example, you could use `{ class: 'my-mark' }` to add a class to the mark's element,
   * or `{ style: { color: 'red' } }` to add inline styles.
   * You can also use a simple object with string values for attributes that don't fit into
   * `class` or `style`, like `{ 'data-foo': 'bar' }`.
   *
   * @default undefined
   */
  attrs?: Record<string, string> | { class: string | string[] } | { style: Record<string, string> }

  /**
   * A keyboard shortcut to toggle this mark in the editor.
   *
   * This should be a string in the format of `Mod-Key` or `Shift-Key`,
   * where `Mod` is the modifier key (Ctrl on Windows/Linux, Command on Mac) and `Key` is the key to press.
   * For example, `Mod-,` would toggle the mark when pressing Ctrl+, on Windows/Linux or Command+, on Mac.
   * You can also use other modifiers like `Alt` or `Shift`.
   *
   * @see https://prosemirror.net/docs/ref/#keymap for more details on the format of keyboard shortcuts.
   *
   * ---
   *
   * Reserved shortcuts (alphabetical order):
   *
   * - `ArrowDown`
   * - `ArrowLeft`
   * - `ArrowRight`
   * - `ArrowUp`
   * - `Backspace`
   * - `Ctrl-d`
   * - `Delete`
   * - `End`
   * - `Enter`
   * - `Escape`
   * - `Home`
   * - `Mod-ArrowDown`
   * - `Mod-ArrowUp`
   * - `Mod-Backspace`
   * - `Mod-d`
   * - `Mod-Enter`
   * - `Mod-k`
   * - `Mod-Shift-Enter`
   * - `Mod-Shift-z`
   * - `Mod-y`
   * - `Mod-z`
   * - `Shift-Enter` (when `allowLineBreaks` is enabled)
   * - `Shift-Tab`
   * - `Tab`
   *
   * @default undefined
   */
  shortcut?: string

  /**
   * The icon to show in the toolbar button for this mark.
   * Must be a valid Tabler icon name.
   *
   * @see https://tabler-icons.io for available icons
   *
   * @default 'asterisk'
   */
  icon?: keyof typeof icons

  /**
   * The label associated with this mark, used for accessibility and in toolbar dropdowns.
   *
   * You can either provide a string or a function that returns a string.
   * The function receives an object with `_` and `__` properties to access the translation functions.
   *
   * Important: When using a function, only use simple anonymous functions without context binding,
   * since the option needs to be serialized for client-side use.
   *
   * If not provided, it will default to the capitalized tag name (e.g. 'strong' → 'Strong').
   *
   * @default undefined
   *
   * @example
   * ```ts
   * // String (non-translatable)
   * label: 'Boxed'
   *
   * // Function (translatable)
   * label: ({ __ }) => __('pruvious-dashboard', 'Boxed')
   * ```
   */
  label?: string | ((context: TranslatableStringCallbackContext) => string)

  /**
   * Inline styles applied to this mark only when rendered in the dashboard editor.
   *
   * This is useful for custom marks (e.g. `<span class="highlight">`) that rely on
   * user-defined CSS on their website. Since the dashboard doesn't load those styles,
   * this option provides a visual representation for content editors.
   *
   * These styles do **not** affect the stored HTML or the live preview - they are applied
   * only in the ProseMirror editor within the dashboard.
   *
   * You can use PUI CSS variables for colors that adapt to light/dark mode:
   *
   * - `hsl(var(--pui-background))` / `hsl(var(--pui-foreground))`
   * - `hsl(var(--pui-card))` / `hsl(var(--pui-card-foreground))`
   * - `hsl(var(--pui-popover))` / `hsl(var(--pui-popover-foreground))`
   * - `hsl(var(--pui-primary))` / `hsl(var(--pui-primary-foreground))`
   * - `hsl(var(--pui-secondary))` / `hsl(var(--pui-secondary-foreground))`
   * - `hsl(var(--pui-muted))` / `hsl(var(--pui-muted-foreground))`
   * - `hsl(var(--pui-accent))` / `hsl(var(--pui-accent-foreground))`
   * - `hsl(var(--pui-destructive))` / `hsl(var(--pui-destructive-foreground))`
   * - `hsl(var(--pui-border))`
   * - `hsl(var(--pui-input))`
   * - `hsl(var(--pui-ring))`
   *
   * @default undefined
   *
   * @example
   * ```ts
   * dashboardStyle: {
   *   padding: '0.125rem 0.25rem',
   *   borderRadius: '0.25rem',
   *   backgroundColor: 'hsl(var(--pui-accent))',
   *   color: 'hsl(var(--pui-accent-foreground))',
   * }
   * ```
   */
  dashboardStyle?: CSSProperties
}

export type StandardToolbarItem = 'clearFormatting' | 'link'

/**
 * A group of toolbar items rendered as a single button that opens a dropdown.
 *
 * `TItem` is the union of items the group's `items` array can contain - typically
 * `mark:<name>` identifiers plus the field-specific standard items.
 *
 * @example
 * ```ts
 * toolbar: [
 *   {
 *     icon: 'typography',
 *     tooltip: ({ __ }) => __('pruvious-dashboard', 'Formats'),
 *     items: ['mark:bold', 'mark:italic', 'mark:underline'],
 *   },
 * ]
 * ```
 */
export interface ToolbarGroup<TItem extends string = string> {
  /**
   * The icon to show for this toolbar group.
   * Must be a valid Tabler icon name.
   *
   * @see https://tabler-icons.io for available icons
   *
   * @default 'paint'
   *
   * @example
   * ```ts
   * icon: 'typography'
   * ```
   */
  icon?: keyof typeof icons

  /**
   * Text shown when hovering over the toolbar group button.
   *
   * You can either provide a string or a function that returns a string.
   * The function receives an object with `_` and `__` properties to access the translation functions.
   *
   * Important: When using a function, only use simple anonymous functions without context binding,
   * since the option needs to be serialized for client-side use.
   *
   * @default undefined
   *
   * @example
   * ```ts
   * // String (non-translatable)
   * tooltip: 'Formats'
   *
   * // Function (translatable)
   * tooltip: ({ __ }) => __('pruvious-dashboard', 'Formats')
   * ```
   */
  tooltip?: string | ((context: TranslatableStringCallbackContext) => string)

  /**
   * The items to show in this toolbar group's dropdown.
   * Can be any combination of mark identifiers (e.g. `mark:bold`) or standard toolbar items (e.g. `clearFormatting`).
   *
   * @example
   * ```ts
   * items: ['mark:bold', 'mark:italic', 'clearFormatting']
   * ```
   */
  items: TItem[]
}

export interface LinksOptions {
  /**
   * Whether to allow linking to drafts (non-public routes and records).
   *
   * When `false`, links to drafts are rejected. Affects `rel://` URLs only.
   *
   * @default true
   */
  allowDrafts?: boolean

  /**
   * Restrict the kinds of internal links this field accepts. Affects `rel://` URLs only;
   * external URLs are gated separately via `allowExternal`.
   *
   * - `'*'` (default) - all routable collections and bare-route links are allowed.
   * - A collection name (e.g. `'Articles'`) - only `rel://Routes:{id}/{Collection}:{recordId}` links to that collection.
   * - `'Routes'` - only bare `rel://Routes:{id}` links (singletons, redirects, reference-less routes).
   * - An array - any of the listed kinds is allowed.
   *
   * @default '*'
   */
  allowedReferences?: '*' | RouteCollectionReferenceName | 'Routes' | (RouteCollectionReferenceName | 'Routes')[]

  /**
   * Whether to allow external URLs (`http://` and `https://`).
   *
   * @default true
   */
  allowExternal?: boolean

  /**
   * Whether to allow hash fragments in the URL.
   *
   * @default true
   */
  allowHash?: boolean

  /**
   * Whether to allow query strings in the URL.
   *
   * @default true
   */
  allowQuery?: boolean

  /**
   * Specifies which languages to show when selecting internal links.
   *
   * @default 'current'
   */
  languages?: 'all' | 'current' | LanguageCode[]

  /**
   * Whether to show the `target` attribute field in the link picker.
   *
   * @default true
   */
  showTarget?: boolean

  /**
   * Whether to show the `rel` attribute field in the link picker.
   *
   * @default true
   */
  showRel?: boolean
}

export type RichTextFormatter = (context: {
  newHTML: string
  oldHTML: string
  newText: string
  oldText: string
}) => (Partial<DynamicBlockFieldTypes['Casted'][BlockName]> & { $key: BlockName }) | undefined

const customOptions: RichTextCustomOptions<string> = {
  allowLineBreaks: true,
  normalizeWhitespace: true,
  marks: {},
  links: true,
  ui: {
    dataTable: {
      hyphenate: true,
      truncate: { lines: 1 },
    },
    liveEditor: {
      deleteBlockWhenEmpty: false,
      formatters: [],
      forwardSlashOpensBlockPicker: true,
      mergeGroups: [],
      toolbar: 'auto',
    },
  },
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
      TextFieldModelOptions<string, string> &
        RichTextCustomOptions<TMark> &
        ResolveFieldUIOptions<{ placeholder: true }>,
      false,
      TRequired,
      TImmutable,
      TAutoGenerated,
      TConditionalLogic,
      GenericDatabase
    >,
  ): Field<
    FieldModel<TextFieldModelOptions<string, string>, 'text', string, string, undefined, undefined, undefined>,
    TextFieldModelOptions<string, string> & RichTextCustomOptions<TMark> & ResolveFieldUIOptions<{ placeholder: true }>,
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
        async (value, sanitizedContextField, errors) => {
          const { richTextValidator } = await import('#pruvious/server')
          await richTextValidator()(value, sanitizedContextField, errors)
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
      TextFieldModelOptions<string, string> &
        RichTextCustomOptions<TMark> &
        ResolveFieldUIOptions<{ placeholder: true }>,
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
      TextFieldModelOptions<string, string> &
        RichTextCustomOptions<TMark> &
        ResolveFieldUIOptions<{ placeholder: true }>,
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
      RichTextCustomOptions<string> &
      ResolveFieldUIOptions<{ placeholder: true }>,
    boolean,
    boolean,
    boolean,
    boolean,
    ConditionalLogic | undefined,
    GenericDatabase
  >,
}
