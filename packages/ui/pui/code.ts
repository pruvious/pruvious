import type { HighlighterCore } from 'shiki'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

let highlighterCore: HighlighterCore | undefined

/**
 * Creates a new Shiki `HighlighterCore` instance.
 *
 * @see https://shiki.style
 */
export async function highlighter() {
  if (!highlighterCore) {
    highlighterCore = await createHighlighterCore({
      themes: [import('@shikijs/themes/github-dark'), import('@shikijs/themes/github-light')],
      langs: [
        import('@shikijs/langs/css'),
        import('@shikijs/langs/html'),
        import('@shikijs/langs/javascript'),
        import('@shikijs/langs/json'),
        import('@shikijs/langs/markdown'),
        import('@shikijs/langs/shell'),
        import('@shikijs/langs/sql'),
        import('@shikijs/langs/typescript'),
        import('@shikijs/langs/vue'),
      ],
      engine: createJavaScriptRegexEngine(),
    })
  }

  return highlighterCore
}
