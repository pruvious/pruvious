import { createPattern, defineTranslation } from '#pruvious/server'

export default defineTranslation({
  'A translation for this language already exists': 'Eine Übersetzung für diese Sprache existiert bereits',

  'Collection not found': 'Die Collection wurde nicht gefunden',

  'Directory': 'Ordner',

  'Failed to abort multipart upload': 'Das Abbrechen des mehrteiligen Uploads ist fehlgeschlagen',
  'Failed to create multipart upload': 'Das Erstellen des mehrteiligen Uploads ist fehlgeschlagen',
  'Failed to fetch image': 'Das Abrufen des Bildes ist fehlgeschlagen',
  'Failed to resume multipart upload': 'Das Wiederaufnehmen des mehrteiligen Uploads ist fehlgeschlagen',
  'Failed to upload file': 'Die Datei konnte nicht hochgeladen werden',
  'Failed to verify existence of ID `$id` in collection `$collection`': createPattern(
    'Die Existenz der ID `$id` in der Collection `$collection` konnte nicht verifiziert werden',
    { id: 'number', collection: 'string' },
  ),
  'File': 'Datei',
  'File not found': 'Die Datei wurde nicht gefunden',

  'Missing file parts: $parts': createPattern('Fehlende Dateiteile: $parts', { parts: 'string' }),

  'Incorrect credentials': 'Falsche Anmeldedaten',
  'Invalid `$param` value. Must be one of: $values': createPattern(
    'Ungültiger Wert für `$param`. Muss einer der folgenden sein: $values',
    { param: 'string', values: 'string' },
  ),
  'Invalid input': 'Ungültige Eingabe',
  'Invalid path': 'Ungültiger Pfad',
  'Invalid RegExp pattern': 'Ungültiges RegExp-Muster',

  'No': 'Nein',
  'No file parts uploaded': 'Keine Dateiteile wurden hochgeladen',
  'No files uploaded': 'Keine Dateien wurden hochgeladen',
  'No file parts have been uploaded': 'Es wurden keine Dateiteile hochgeladen',
  'None': 'Keine',

  'Only one file part can be uploaded at a time': 'Nur ein Dateiteil kann gleichzeitig hochgeladen werden',

  'Pruvious is already installed': 'Pruvious ist bereits installiert',

  'Record does not exist': 'Der Datensatz existiert nicht',
  'Request content type must be `$type`': createPattern('Der Anforderungsinhaltstyp muss `$type` sein', {
    type: 'string',
  }),
  'Resource not found': 'Ressource nicht gefunden',
  'Route reference not found': 'Routenreferenz nicht gefunden',

  'Singleton not found': 'Singleton nicht gefunden',

  'The `$param` parameter is invalid': createPattern('Der Parameter `$param` ist ungültig', { param: 'string' }),
  'The `$param` parameter is required': createPattern('Der Parameter `$param` ist erforderlich', { param: 'string' }),
  'The `$param` parameter must be a boolean': createPattern('Der Parameter `$param` muss ein boolescher Wert sein', {
    param: 'string',
  }),
  'The `$param` parameter must be a number between $min and $max': createPattern(
    'Der Parameter `$param` muss eine Zahl zwischen $min und $max sein',
    { param: 'string', min: 'number', max: 'number' },
  ),
  "The `$param` parameter must be a positive integer or 'auto'": createPattern(
    'Der Parameter `$param` muss eine positive Ganzzahl oder `auto` sein',
    { param: 'string' },
  ),
  'The `$param` parameter must be a positive number': createPattern(
    'Der Parameter `$param` muss eine positive Zahl sein',
    { param: 'string' },
  ),
  'The `$param` parameter must be a string': createPattern('Der Parameter `$param` muss eine Zeichenkette sein', {
    param: 'string',
  }),
  'The `$param` parameter must be an integer between $min and $max': createPattern(
    'Der Parameter `$param` muss eine Ganzzahl zwischen $min und $max sein',
    { param: 'string', min: 'number', max: 'number' },
  ),
  'The $subject must be an image': createPattern('Das $subject muss ein Bild sein', { subject: 'string' }),
  'The difference between the values must be greater than or equal to `$minRange`': createPattern(
    'Die Differenz zwischen den Werten muss größer oder gleich `$minRange` sein',
    { minRange: 'string' },
  ),
  'The difference between the values must be less than or equal to `$maxRange`': createPattern(
    'Die Differenz zwischen den Werten muss kleiner oder gleich `$maxRange` sein',
    { maxRange: 'string' },
  ),
  'The email address is already in use': 'Die E-Mail-Adresse wird bereits verwendet',
  'The field `$field` cannot be used for filtering': createPattern(
    'Das Feld `$field` kann nicht zum Filtern verwendet werden',
    { field: 'string' },
  ),
  'The field `$field` cannot be used for grouping': createPattern(
    'Das Feld `$field` kann nicht zum Gruppieren verwendet werden',
    { field: 'string' },
  ),
  'The field `$field` cannot be used for sorting': createPattern(
    'Das Feld `$field` kann nicht zum Sortieren verwendet werden',
    { field: 'string' },
  ),
  'The ID must be a positive integer': 'Die ID muss eine positive Ganzzahl sein',
  'The language `$language` is not supported': createPattern('Die Sprache `$language` wird nicht unterstützt', {
    language: 'string',
  }),
  'The new path cannot be a subdirectory of the current path':
    'Der neue Pfad darf kein Unterverzeichnis des aktuellen Pfads sein',
  'The new path cannot be the root directory': 'Der neue Pfad darf nicht das Stammverzeichnis sein',
  'The new path must be different from the current path': 'Der neue Pfad muss sich vom aktuellen Pfad unterscheiden',
  'The file part has already been uploaded': 'Der Dateiteil wurde bereits hochgeladen',
  'The image has already been registered': 'Das Bild wurde bereits registriert',
  'The image has not been registered': 'Das Bild wurde nicht registriert',
  'The path must be unique': 'Der Pfad muss eindeutig sein',
  'The singleton `$singleton` does not exist': createPattern('Der Singleton `$singleton` existiert nicht', {
    singleton: 'string',
  }),
  'The singleton `$singleton` is not translatable': createPattern('Der Singleton `$singleton` ist nicht übersetzbar', {
    singleton: 'string',
  }),
  'The source and target languages must be different': 'Die Quell- und Zielsprachen müssen unterschiedlich sein',
  'The value must be rounded to seconds': 'Der Wert muss auf Sekunden gerundet werden',
  'The value must be rounded to the nearest UTC day': 'Der Wert muss auf den nächsten UTC-Tag gerundet werden',
  'The values must be greater than or equal to `$min`': createPattern(
    'Die Werte müssen größer oder gleich `$min` sein',
    { min: 'number' },
  ),
  'The values must be integers': 'Die Werte müssen Ganzzahlen sein',
  'The values must be less than or equal to `$max`': createPattern('Die Werte müssen kleiner oder gleich `$max` sein', {
    max: 'number',
  }),
  'The values must be rounded to seconds': 'Die Werte müssen auf Sekunden gerundet werden',
  'The values must be rounded to the nearest UTC day': 'Die Werte müssen auf den nächsten UTC-Tag gerundet werden',
  'This directory contains nested files or directories that cannot be deleted':
    'Dieser Ordner enthält verschachtelte Dateien oder Ordner, die nicht gelöscht werden können',
  'This directory contains nested files or directories that cannot be moved':
    'Dieser Ordner enthält verschachtelte Dateien oder Ordner, die nicht verschoben werden können',
  'This field contains IDs that do not exist in the related collection':
    'Dieses Feld enthält IDs, die nicht in der zugehörigen Collection existieren',
  'This query parameter is required': 'Dieser Abfrageparameter ist erforderlich',

  'Yes': 'Ja',
  'You do not have permission to change administrator email addresses':
    'Sie haben keine Berechtigung, die E-Mail-Adressen von Administratoren zu ändern',
  'You do not have permission to change administrator passwords':
    'Sie haben keine Berechtigung, die Passwörter von Administratoren zu ändern',
  'You do not have permission to change the active status of administrators':
    'Sie haben keine Berechtigung, den Aktivstatus von Administratoren zu ändern',
  'You do not have permission to delete administrators': 'Sie haben keine Berechtigung, Administratoren zu löschen',
  'You do not have permission to manage administrators': 'Sie haben keine Berechtigung, Administratoren zu verwalten',
  'You do not have permission to sign out other users': 'Sie haben keine Berechtigung, andere Benutzer abzumelden',
})
