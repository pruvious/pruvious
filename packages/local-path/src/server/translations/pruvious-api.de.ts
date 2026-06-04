import { createPattern, defineTranslation } from '#pruvious/server'

export default defineTranslation({
  'A folder with this name already exists': 'Ein Ordner mit diesem Namen existiert bereits',

  'Failed to create folder': 'Ordner konnte nicht erstellt werden',

  'The path `$path` does not exist or is not accessible': createPattern(
    'Der Pfad `$path` existiert nicht oder ist nicht zugänglich',
    { path: 'string' },
  ),
  'The path `$path` is not writable': createPattern('Der Pfad `$path` ist nicht beschreibbar', { path: 'string' }),
  'The path `$path` must be a file': createPattern('Der Pfad `$path` muss eine Datei sein', { path: 'string' }),
  'The path `$path` must be a directory': createPattern('Der Pfad `$path` muss ein Verzeichnis sein', {
    path: 'string',
  }),
})
