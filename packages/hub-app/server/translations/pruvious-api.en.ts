import { defineTranslation } from '#pruvious/server'

/**
 * Hub-app extension of the framework's `pruvious-api` namespace.
 * The framework merges same-named translation files across layers, so these strings become
 * part of `pruvious-api` at runtime and are usable server-side via `__('pruvious-api', ...)`.
 */
export default defineTranslation({
  'A backup is already queued or running for this target': 'A backup is already queued or running for this target',
  'A deployment is already queued or running for this target':
    'A deployment is already queued or running for this target',
  'A restore is already queued or running for this target': 'A restore is already queued or running for this target',

  'Backup cannot be restored before it finishes successfully':
    'Backup cannot be restored before it finishes successfully',
  'Backup not found': 'Backup not found',

  'Deployment not found': 'Deployment not found',
  'Deployment target not found': 'Deployment target not found',

  'Failed to create backup': 'Failed to create backup',
  'Failed to create deployment': 'Failed to create deployment',
  'Failed to create restore': 'Failed to create restore',

  'Hub-app restarted while this deploy was in progress': 'Hub-app restarted while this deploy was in progress',

  'Invalid backup type': 'Invalid backup type',

  'No package.json found in the selected directory': 'No package.json found in the selected directory',

  'package.json is not valid JSON': 'package.json is not valid JSON',

  'Restore not found': 'Restore not found',
  'Restore requires explicit confirmation': 'Restore requires explicit confirmation',

  'The key `$key` is already defined for one of the selected targets by record #$id':
    'The key `$key` is already defined for one of the selected targets by record #$id',
  'The key `$key` is declared for the same target by another row in this batch':
    'The key `$key` is declared for the same target by another row in this batch',
  'The selected directory is not a Pruvious project': 'The selected directory is not a Pruvious project',

  'You do not have permission to deploy this target': 'You do not have permission to deploy this target',
})
