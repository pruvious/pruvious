import { defineTranslation } from '#pruvious/server'

// Demo regional override: `'404'` wins over the base `de`, `'Page not found'` is intentionally
// omitted so it falls back to `default.de.ts`.
export default defineTranslation({
  '404': '404 (AT)',
})
