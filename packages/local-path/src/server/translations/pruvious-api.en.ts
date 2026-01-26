import { createPattern, defineTranslation } from '#pruvious/server'

export default defineTranslation({
  'The path `$path` does not exist or is not accessible': createPattern(
    'The path `$path` does not exist or is not accessible',
    { path: 'string' },
  ),
  'The path `$path` must be a file': createPattern('The path `$path` must be a file', { path: 'string' }),
  'The path `$path` must be a directory': createPattern('The path `$path` must be a directory', { path: 'string' }),
})
