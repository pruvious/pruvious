import { createPattern, defineTranslation } from '#pruvious/server'

export default defineTranslation({
  'The path `$path` does not exist or is not accessible': createPattern(
    'Der Pfad `$path` existiert nicht oder ist nicht zugänglich',
    { path: 'string' },
  ),
  'The path `$path` must be a file': createPattern('Der Pfad `$path` muss eine Datei sein', { path: 'string' }),
  'The path `$path` must be a directory': createPattern('Der Pfad `$path` muss ein Verzeichnis sein', {
    path: 'string',
  }),
})
