import { defineTranslation } from '#pruvious/server'

/**
 * Hub-app extension of the framework's `pruvious-api` namespace.
 */
export default defineTranslation({
  'A backup is already queued or running for this target':
    'Ein Backup für dieses Ziel ist bereits in der Warteschlange oder läuft',
  'A deployment is already queued or running for this target':
    'Eine Bereitstellung für dieses Ziel ist bereits in der Warteschlange oder läuft',
  'A restore is already queued or running for this target':
    'Eine Wiederherstellung für dieses Ziel ist bereits in der Warteschlange oder läuft',

  'Backup cannot be restored before it finishes successfully':
    'Backup kann erst nach erfolgreichem Abschluss wiederhergestellt werden',
  'Backup not found': 'Backup nicht gefunden',

  'Deployment not found': 'Bereitstellung nicht gefunden',
  'Deployment target not found': 'Bereitstellungsziel nicht gefunden',

  'Failed to create backup': 'Backup konnte nicht erstellt werden',
  'Failed to create deployment': 'Bereitstellung konnte nicht erstellt werden',
  'Failed to create restore': 'Wiederherstellung konnte nicht erstellt werden',

  'Hub-app restarted while this deploy was in progress': 'Hub-App wurde während dieser Bereitstellung neu gestartet',

  'Invalid backup type': 'Ungültiger Backup-Typ',

  'No package.json found in the selected directory': 'Keine package.json im ausgewählten Verzeichnis gefunden',

  'package.json is not valid JSON': 'package.json ist kein gültiges JSON',

  'Restore not found': 'Wiederherstellung nicht gefunden',
  'Restore requires explicit confirmation': 'Wiederherstellung erfordert eine ausdrückliche Bestätigung',

  'The key `$key` is already defined for one of the selected targets by record #$id':
    'Der Schlüssel `$key` ist für eines der ausgewählten Ziele bereits durch Datensatz #$id definiert',
  'The key `$key` is declared for the same target by another row in this batch':
    'Der Schlüssel `$key` ist für dasselbe Ziel bereits durch eine andere Zeile in diesem Vorgang deklariert',
  'The selected directory is not a Pruvious project': 'Das ausgewählte Verzeichnis ist kein Pruvious-Projekt',

  'You do not have permission to deploy this target': 'Du hast keine Berechtigung, dieses Ziel bereitzustellen',
})
