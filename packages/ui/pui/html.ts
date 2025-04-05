import { withLeadingSlash, withoutLeadingSlash, withoutTrailingSlash, withTrailingSlash } from '@pruvious/utils'
import type { default as _DOMPurify } from 'dompurify'
import type { marked as _marked, MarkedOptions, Tokens } from 'marked'

export interface PUIMarkdownOptions {
  /**
   * The base path to use for relative URLs in the markdown content.
   * If provided, all relative URLs will be prefixed with this path.
   *
   * @default undefined
   */
  basePath?: string

  /**
   * Whether to sanitize the HTML output to prevent Cross-Site Scripting (XSS) attacks.
   *
   * @default true
   */
  sanitize?: boolean
}

let marked: typeof _marked
let DOMPurify: typeof _DOMPurify
let Renderer: any
let initialized = false

/**
 * Initializes the `marked` and `DOMPurify` libraries for use in the PUI HTML module.
 * This function should be called before using the `puiMarkdown` or `puiSanitize` functions.
 */
export async function puiHTMLInit() {
  if (!initialized) {
    marked = await import('marked').then((m) => m.marked)
    DOMPurify = await import('dompurify').then((m) => m.default)
    Renderer = class extends marked.Renderer {
      protected basePath?: string

      constructor(options?: Pick<PUIMarkdownOptions, 'basePath'> & MarkedOptions) {
        super(options)
        this.basePath = options?.basePath ? withLeadingSlash(withTrailingSlash(options.basePath)) : undefined
      }

      override table(token: Tokens.Table): string {
        return super.table(token).replace(/\n<thead>\n<tr>\n(?:<th><\/th>\n)*<\/tr>\n<\/thead>/gm, '')
      }

      override link(token: Tokens.Link): string {
        const href =
          !this.basePath ||
          token.href.startsWith('http://') ||
          token.href.startsWith('https://') ||
          token.href.startsWith('.')
            ? token.href
            : this.basePath + withoutLeadingSlash(withoutTrailingSlash(token.href))

        let html = super.link({ ...token, href })

        if (token.href.startsWith('http://') || token.href.startsWith('https://')) {
          html = html.slice(0, 2) + ' target="_blank" rel="noopener noreferrer"' + html.slice(2)
        }

        return html
      }
    }
    initialized = true
  }
}

/**
 * Converts a `markdown` string into HTML and optionally sanitizes it for secure display.
 *
 * Dependencies:
 *
 * - [`marked`](https://www.npmjs.com/package/marked) - for markdown to HTML conversion.
 * - [`DOMPurify`](https://www.npmjs.com/package/dompurify) - for HTML sanitization.
 */
export function puiMarkdown(markdown: string, options?: PUIMarkdownOptions): string {
  const sanitize = options?.sanitize ?? true
  const html = marked!.parse(markdown, { renderer: new Renderer(options) }) as string
  return sanitize ? puiSanitize(html) : html
}

/**
 * Sanitizes an `html` string to prevent Cross-Site Scripting (XSS) attacks by removing malicious code.
 * Uses [`DOMPurify`](https://www.npmjs.com/package/dompurify) library to clean the HTML content.
 */
export function puiSanitize(html: string): string {
  return DOMPurify!.sanitize(html, { ADD_ATTR: ['target'] })
}
