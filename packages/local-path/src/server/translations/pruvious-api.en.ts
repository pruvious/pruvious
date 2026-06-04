import { createPattern, defineTranslation } from '#pruvious/server'

export default defineTranslation({
  'A folder with this name already exists': 'A folder with this name already exists',

  'Failed to create folder': 'Failed to create folder',

  'The path `$path` does not exist or is not accessible': createPattern(
    'The path `$path` does not exist or is not accessible',
    { path: 'string' },
  ),
  'The path `$path` is not writable': createPattern('The path `$path` is not writable', { path: 'string' }),
  'The path `$path` must be a file': createPattern('The path `$path` must be a file', { path: 'string' }),
  'The path `$path` must be a directory': createPattern('The path `$path` must be a directory', { path: 'string' }),
})
