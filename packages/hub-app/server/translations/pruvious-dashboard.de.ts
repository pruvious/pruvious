import { createPattern, defineTranslation } from '#pruvious/server'

export default defineTranslation({
  'A deployment is already queued or running for this target':
    'Eine Bereitstellung für dieses Ziel ist bereits in der Warteschlange oder läuft',
  'A previous deployment left a stale sync lock on this target. Click to release it before the TTL expires.':
    'Eine vorherige Bereitstellung hat ein veraltetes Sync-Lock auf diesem Ziel hinterlassen. Klicken Sie, um es vor Ablauf der TTL freizugeben.',
  'Acquired at': 'Erworben am',
  "Absolute path on this machine to the existing Pruvious project. Pick the project's **root directory** - the one that contains `nuxt.config.ts` and a `package.json` listing `pruvious` in its dependencies. The deployer reads source from here and runs the build inside it.":
    'Absoluter Pfad auf diesem Rechner zum bestehenden Pruvious-Projekt. Wähle das **Stammverzeichnis** des Projekts - das Verzeichnis, das `nuxt.config.ts` und eine `package.json` mit `pruvious` in den Abhängigkeiten enthält. Der Deployer liest die Quellen von hier und führt den Build darin aus.',
  'Allocated port': 'Zugewiesener Port',
  'Allowed deployers': 'Berechtigte Deployer',
  'API token': 'API-Token',
  'Auto': 'Auto',

  'Backup': 'Backup',
  'Backup database': 'Datenbank sichern',
  'Backup failed': 'Backup fehlgeschlagen',
  'Backup full': 'Vollständig sichern',
  'Backup uploads': 'Uploads sichern',
  'Backups': 'Backups',
  'Bound as `CACHE` in the Worker. Used when the project sets `pruvious.cache.driver` to `d1://CACHE`. Leave empty to fall back to the main database.':
    'Im Worker als `CACHE` gebunden. Wird verwendet, wenn das Projekt `pruvious.cache.driver` auf `d1://CACHE` setzt. Leer lassen, um auf die Hauptdatenbank zurückzufallen.',
  'Bound as `DB` in the Worker. Find the name with `npx wrangler d1 list` and the ID with `npx wrangler d1 info <name>`, or in the Cloudflare dashboard under Workers & Pages → D1. Create one with `npx wrangler d1 create <name>`.':
    'Im Worker als `DB` gebunden. Den Namen mit `npx wrangler d1 list` und die ID mit `npx wrangler d1 info <name>` ermitteln, oder im Cloudflare-Dashboard unter Workers & Pages → D1. Mit `npx wrangler d1 create <name>` erstellen.',
  'Bound as `LOGS` in the Worker. Used when the project sets `pruvious.logs.driver` to `d1://LOGS`. Leave empty to fall back to the main database.':
    'Im Worker als `LOGS` gebunden. Wird verwendet, wenn das Projekt `pruvious.logs.driver` auf `d1://LOGS` setzt. Leer lassen, um auf die Hauptdatenbank zurückzufallen.',
  'Bound as `QUEUE` in the Worker. Used when the project sets `pruvious.queue.driver` to `d1://QUEUE` (also stores job locks). Leave empty to fall back to the main database.':
    'Im Worker als `QUEUE` gebunden. Wird verwendet, wenn das Projekt `pruvious.queue.driver` auf `d1://QUEUE` setzt (speichert auch Job-Locks). Leer lassen, um auf die Hauptdatenbank zurückzufallen.',
  'Branch': 'Branch',
  'Build command': 'Build-Befehl',

  'Cache D1 database': 'Cache-D1-Datenbank',
  'Cloudflare account ID': 'Cloudflare-Konto-ID',
  'Cloudflare API token. Minimum scopes for deploys: `Workers Scripts: Edit`, `Account Settings: Read`, `User Details: Read`. Add `D1: Edit` to enable database backup/restore, and `Workers R2 Storage: Edit` to enable uploads backup/restore. Create one at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens), then store it as a Secret here.':
    'Cloudflare-API-Token. Mindestberechtigungen für Bereitstellungen: `Workers Scripts: Edit`, `Account Settings: Read`, `User Details: Read`. `D1: Edit` ergänzen, um Datenbank-Backup/Restore zu aktivieren, und `Workers R2 Storage: Edit` für Uploads-Backup/Restore. Unter [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) erstellen und anschließend hier als Geheimnis speichern.',
  'Cloudflare config': 'Cloudflare-Konfiguration',
  'Cloudflare Workers': 'Cloudflare Workers',
  'Commit': 'Commit',

  'Database': 'Datenbank',
  'Database driver': 'Datenbanktreiber',
  'Deploy': 'Bereitstellen',
  'Deploy failed': 'Bereitstellung fehlgeschlagen',
  'Deploy lock': 'Bereitstellungssperre',
  'Deployment': 'Bereitstellung',
  'Deployment target': 'Bereitstellungsziel',
  'Deployment targets': 'Bereitstellungsziele',
  'Deployments': 'Bereitstellungen',
  'Domain': 'Domain',
  'Duration': 'Dauer',

  'Environment variables': 'Umgebungsvariablen',
  'Expires at': 'Läuft ab am',

  'Failed to load backup': 'Backup konnte nicht geladen werden',
  'Failed to load deployment': 'Bereitstellung konnte nicht geladen werden',
  'Failed to load restore': 'Wiederherstellung konnte nicht geladen werden',
  'Failed to load scaffold': 'Scaffold konnte nicht geladen werden',
  'Failed to load targets': 'Ziele konnten nicht geladen werden',
  'Failed to start scaffold': 'Scaffold konnte nicht gestartet werden',
  'Finished at': 'Abgeschlossen am',
  'Full': 'Vollständig',

  'Generic': 'Generisch',

  'Hostname or IP of the Ubuntu server to deploy to.':
    'Hostname oder IP des Ubuntu-Servers, auf dem bereitgestellt werden soll.',
  'Hub-side': 'Auf dem Hub',

  'If empty, deploys whatever branch is currently checked out locally. Otherwise, the deployer runs `git checkout` + `git pull --ff-only` before building.':
    'Wenn leer, wird der aktuell lokal ausgecheckte Branch bereitgestellt. Andernfalls führt der Deployer `git checkout` + `git pull --ff-only` vor dem Build aus.',
  'In worker (default)': 'Im Worker (Standard)',
  'Is secret': 'Ist geheim',

  'KV namespace ID': 'KV-Namespace-ID',
  'KV namespace UUID. Find with `npx wrangler kv namespace list` or in the dashboard under Workers KV.':
    'KV-Namespace-UUID. Mit `npx wrangler kv namespace list` oder im Dashboard unter Workers KV ermitteln.',

  'Last deployed': 'Zuletzt bereitgestellt',
  'Last deployment status': 'Letzter Bereitstellungsstatus',
  'Last used': 'Zuletzt verwendet',
  'Live': 'Live',
  'Loading': 'Lädt',
  'Log': 'Log',
  'Log path': 'Log-Pfad',
  'Logs D1 database': 'Logs-D1-Datenbank',

  'Main D1 database': 'Haupt-D1-Datenbank',
  'Must be unique within the project.': 'Muss innerhalb des Projekts eindeutig sein.',

  'Netlify': 'Netlify',
  'Netlify config': 'Netlify-Konfiguration',
  'Netlify personal access token. Create one at [app.netlify.com/user/applications](https://app.netlify.com/user/applications).':
    'Persönliches Netlify-Zugangstoken. Unter [app.netlify.com/user/applications](https://app.netlify.com/user/applications) erstellen.',
  'Netlify site ID': 'Netlify-Site-ID',
  'No deployment targets yet': 'Noch keine Bereitstellungsziele',
  'No deployments yet': 'Noch keine Bereitstellungen',
  'Node.js major version to provision (e.g., `22`). Skipped if Node is already installed.':
    'Bereitzustellende Node.js-Hauptversion (z. B. `22`). Übersprungen, wenn Node bereits installiert ist.',
  'Node.js version': 'Node.js-Version',
  'Non-admin users granted permission to deploy this target. Administrators always have access. Leave empty to restrict deploys to administrators.':
    'Nicht-Administrator-Nutzer mit der Berechtigung, dieses Ziel bereitzustellen. Administratoren haben immer Zugriff. Leer lassen, um Bereitstellungen auf Administratoren zu beschränken.',

  'Optional. Required only for org-owned projects. Team Settings → General.':
    'Optional. Nur für organisationseigene Projekte erforderlich. Team-Einstellungen → Allgemein.',
  'Override the build command run by the deployer. Leave empty to auto-detect from the project lockfile (`pnpm-lock.yaml` → `pnpm run build`, `bun.lock` → `bun run build`, `yarn.lock` → `yarn build`, otherwise `npm run build`).':
    'Überschreibt den vom Deployer ausgeführten Build-Befehl. Leer lassen, um anhand der Projekt-Lockdatei automatisch zu erkennen (`pnpm-lock.yaml` → `pnpm run build`, `bun.lock` → `bun run build`, `yarn.lock` → `yarn build`, sonst `npm run build`).',

  'Port': 'Port',
  'Post-build command': 'Post-Build-Befehl',
  'Post-deploy command': 'Post-Deploy-Befehl',
  'Pre-build command': 'Pre-Build-Befehl',
  'Private SSH key with access to this server. Store it as a Secret of type `ssh-key`.':
    'Privater SSH-Schlüssel mit Zugriff auf diesen Server. Als Geheimnis vom Typ `ssh-key` speichern.',
  'Project': 'Projekt',
  'Project name': 'Projektname',
  'Project Settings → General → Project ID on the Vercel dashboard.':
    'Projekteinstellungen → Allgemein → Projekt-ID im Vercel-Dashboard.',
  'Pruvious projects': 'Pruvious-Projekte',
  "Public domain served by this target. Used by the deployer to configure the reverse proxy (nginx) and request a Let's Encrypt certificate.":
    "Öffentliche Domain, die von diesem Ziel bereitgestellt wird. Wird vom Deployer verwendet, um den Reverse-Proxy (nginx) zu konfigurieren und ein Let's-Encrypt-Zertifikat anzufordern.",

  'Queue D1 database': 'Queue-D1-Datenbank',
  'Queued': 'In Warteschlange',

  'R2 bucket binding': 'R2-Bucket-Binding',
  'R2 bucket name (not a URL). Create with `npx wrangler r2 bucket create <name>` or in the Cloudflare dashboard.':
    'R2-Bucket-Name (keine URL). Mit `npx wrangler r2 bucket create <name>` oder im Cloudflare-Dashboard erstellen.',
  'Recent deployments': 'Aktuelle Bereitstellungen',
  'Redeploy': 'Erneut bereitstellen',
  'Redeploy failed': 'Erneute Bereitstellung fehlgeschlagen',
  'Restore': 'Wiederherstellen',
  'Restore failed': 'Wiederherstellung fehlgeschlagen',
  'Restores': 'Wiederherstellungen',
  'Right sidebar of any page in the [Cloudflare dashboard](https://dash.cloudflare.com), or run `npx wrangler whoami`.':
    'Rechte Seitenleiste jeder Seite im [Cloudflare-Dashboard](https://dash.cloudflare.com) oder `npx wrangler whoami` ausführen.',
  'Running': 'Läuft',

  'Schema sync mode': 'Schema-Sync-Modus',
  'Secret name': 'Geheimnisname',
  'Secret type': 'Geheimnistyp',
  'Secret value (write-only, stored encrypted)': 'Geheimnis-Wert (nur schreibbar, verschlüsselt gespeichert)',
  'Secrets': 'Geheimnisse',
  'Select a project': 'Projekt auswählen',
  'Select a secret': 'Geheimnis auswählen',
  'Select a target': 'Ziel auswählen',
  'Select deployment targets': 'Deployment-Ziele auswählen',
  'Server': 'Server',
  'Shell snippet executed after the build, before the deploy is uploaded - after the project-level post-build command. A non-zero exit aborts the deploy.':
    'Shell-Snippet, das nach dem Build und vor dem Upload der Bereitstellung ausgeführt wird - nach dem projektweiten Post-Build-Befehl. Ein Exitcode ungleich Null bricht die Bereitstellung ab.',
  'Shell snippet executed after the build, before the deploy is uploaded. A non-zero exit aborts the deploy. Runs in the project directory.':
    'Shell-Snippet, das nach dem Build und vor dem Upload der Bereitstellung ausgeführt wird. Ein Exitcode ungleich Null bricht die Bereitstellung ab. Läuft im Projektverzeichnis.',
  'Shell snippet executed after the deploy finishes, after the project-level post-deploy command. Use `$DEPLOY_STATUS` (`success` or `failed`). Failures here are logged but do not change the deployment status.':
    'Shell-Snippet, das nach Abschluss der Bereitstellung ausgeführt wird - nach dem projektweiten Post-Deploy-Befehl. `$DEPLOY_STATUS` (`success` oder `failed`) verwenden. Fehler werden protokolliert, ändern aber den Bereitstellungsstatus nicht.',
  'Shell snippet executed after the deploy finishes, regardless of outcome. Use `$DEPLOY_STATUS` (`success` or `failed`) to branch behavior; `$DEPLOY_ERROR` carries the failure message. Failures here are logged but do not change the deployment status. Also available: `$DEPLOY_ID`, `$DEPLOY_BRANCH`, `$DEPLOY_PROJECT_NAME`, `$DEPLOY_PROJECT_PATH`, `$DEPLOY_TARGET_NAME`, `$DEPLOY_TARGET_TYPE`, `$DEPLOY_TARGET_ID`.':
    'Shell-Snippet, das nach Abschluss der Bereitstellung unabhängig vom Ergebnis ausgeführt wird. `$DEPLOY_STATUS` (`success` oder `failed`) zur Fallunterscheidung verwenden; `$DEPLOY_ERROR` enthält die Fehlermeldung. Fehler werden protokolliert, ändern aber den Bereitstellungsstatus nicht. Weiter verfügbar: `$DEPLOY_ID`, `$DEPLOY_BRANCH`, `$DEPLOY_PROJECT_NAME`, `$DEPLOY_PROJECT_PATH`, `$DEPLOY_TARGET_NAME`, `$DEPLOY_TARGET_TYPE`, `$DEPLOY_TARGET_ID`.',
  'Shell snippet executed before the build for every target of this project. A non-zero exit aborts the deploy. Runs in the project directory with the same environment variables as the build.':
    'Shell-Snippet, das vor dem Build für jedes Ziel dieses Projekts ausgeführt wird. Ein Exitcode ungleich Null bricht die Bereitstellung ab. Läuft im Projektverzeichnis mit denselben Umgebungsvariablen wie der Build.',
  'Shell snippet executed before the build, after the project-level pre-build command. A non-zero exit aborts the deploy. Runs in the project directory.':
    'Shell-Snippet, das vor dem Build ausgeführt wird - nach dem projektweiten Pre-Build-Befehl. Ein Exitcode ungleich Null bricht die Bereitstellung ab. Läuft im Projektverzeichnis.',
  'Size': 'Größe',
  'Site Configuration → General → Site ID on the Netlify dashboard.':
    'Site-Konfiguration → Allgemein → Site-ID im Netlify-Dashboard.',
  'Source directory': 'Quellverzeichnis',
  'SSH key': 'SSH-Schlüssel',
  'SSH login user. Must have passwordless sudo so the deployer can install nginx, certbot, Node.js, PM2, and (optionally) PostgreSQL.':
    'SSH-Benutzer für die Anmeldung. Muss passwortloses sudo besitzen, damit der Deployer nginx, certbot, Node.js, PM2 und (optional) PostgreSQL installieren kann.',
  'SSH port. Default 22.': 'SSH-Port. Standard 22.',
  'SSH user': 'SSH-Benutzer',
  'Started at': 'Gestartet am',
  'Storage path': 'Speicherpfad',
  'Stored encrypted at rest. Synced to the worker as a secret on each deploy.':
    'Verschlüsselt im Ruhezustand gespeichert. Wird bei jeder Bereitstellung als Geheimnis mit dem Worker synchronisiert.',

  'Target name': 'Zielname',
  'Target type': 'Zieltyp',
  'Targets': 'Ziele',
  'Trigger a new backup for this target': 'Ein neues Backup für dieses Ziel starten',
  'Trigger a new deployment for this target': 'Eine neue Bereitstellung für dieses Ziel starten',
  'Triggered by': 'Ausgelöst von',
  'This will overwrite the current state of **$target** with the contents of this backup. This action cannot be undone.':
    createPattern(
      'Dadurch wird der aktuelle Zustand von **$target** mit dem Inhalt dieses Backups überschrieben. Diese Aktion kann nicht rückgängig gemacht werden.',
      { target: 'string' },
    ),

  'Unique name for the Worker. Created automatically on first deploy if it does not exist.':
    'Eindeutiger Name für den Worker. Wird beim ersten Deploy automatisch erstellt, falls er noch nicht existiert.',
  'Uploads': 'Uploads',

  'Value': 'Wert',
  'Variable name available to the build and runtime. Convention: `UPPER_SNAKE_CASE`.':
    'Variablenname, der dem Build und der Laufzeit zur Verfügung steht. Konvention: `UPPER_SNAKE_CASE`.',
  'Vercel': 'Vercel',
  'Vercel access token. Create one at [vercel.com/account/tokens](https://vercel.com/account/tokens) with full account scope, then store it as a Secret.':
    'Vercel-Zugangstoken. Unter [vercel.com/account/tokens](https://vercel.com/account/tokens) mit vollem Konto-Scope erstellen und anschließend als Geheimnis speichern.',
  'Vercel config': 'Vercel-Konfiguration',
  'Vercel project ID': 'Vercel-Projekt-ID',
  'Vercel team ID': 'Vercel-Team-ID',
  'VPS': 'VPS',
  'VPS config': 'VPS-Konfiguration',

  'When the provider supports it, secrets sync as encrypted, non-retrievable bindings (Cloudflare `wrangler secret put`, Vercel/Netlify sensitive env vars). Non-secrets sync as plain variables visible in the provider dashboard (Cloudflare `[vars]` block). On VPS this only affects log masking.':
    'Sofern vom Provider unterstützt, werden Geheimnisse als verschlüsselte, nicht abrufbare Bindings synchronisiert (Cloudflare `wrangler secret put`, sensible Vercel-/Netlify-Variablen). Nicht-Geheimnisse werden als einfache, im Provider-Dashboard sichtbare Variablen synchronisiert (Cloudflare `[vars]`-Block). Auf VPS beeinflusst dies nur die Log-Maskierung.',
  'Where the database schema sync runs. `In worker` runs sync on the deployed worker at first request (default, matches existing behaviour). `Hub-side` runs sync in the hub between build and deploy by pulling D1 to a local SQLite file, syncing, then pushing back - use this when in-worker sync exceeds Cloudflare timeouts.':
    'Wo das Datenbank-Schema-Sync läuft. `Im Worker` führt das Sync beim ersten Request des bereitgestellten Workers aus (Standard, entspricht dem bisherigen Verhalten). `Auf dem Hub` führt das Sync im Hub zwischen Build und Deploy aus: D1 wird in eine lokale SQLite-Datei gezogen, synchronisiert und zurückgeschrieben - nutze diese Option, wenn das In-Worker-Sync die Cloudflare-Timeouts überschreitet.',
  'Which database the app will run against on this server.':
    'Gegen welche Datenbank die App auf diesem Server laufen soll.',
  'Worker name': 'Worker-Name',
  'Workspace': 'Workspace',

  'Absolute path on this hub machine. The project is created in `<parent>/<slugified-name>`.':
    'Absoluter Pfad auf diesem Hub-Rechner. Das Projekt wird in `<parent>/<slugified-name>` erstellt.',
  'Add existing': 'Bestehendes hinzufügen',

  'BCP-47, e.g. `en`, `de-AT`.': 'BCP-47, z. B. `en`, `de-AT`.',

  'Cancel': 'Abbrechen',

  'Install dependencies after scaffolding': 'Abhängigkeiten nach dem Scaffolding installieren',

  'Language code': 'Sprachcode',
  'Language name': 'Sprachname',

  'my-pruvious-app': 'my-pruvious-app',

  'Overwrite if target exists': 'Überschreiben, falls das Ziel existiert',

  'Package manager': 'Paketmanager',
  'Parent directory': 'Übergeordnetes Verzeichnis',
  'Pruvious version or dist-tag': 'Pruvious-Version oder Dist-Tag',

  'Retry': 'Wiederholen',
  'Run the scaffold again with the same settings (overwrites the partial directory)':
    'Scaffold mit denselben Einstellungen erneut ausführen (überschreibt das unvollständige Verzeichnis)',

  'Scaffold': 'Scaffold',
  'Scaffold new project': 'Neues Projekt anlegen',
  'Scaffolding': 'Scaffolding',
  'Scaffolds': 'Scaffolds',
  'Select parent directory': 'Übergeordnetes Verzeichnis auswählen',

  'Target directory': 'Zielverzeichnis',

  "Used as the npm `name` in the new project's `package.json` and as the dashboard label.":
    'Wird als npm-`name` in der `package.json` des neuen Projekts und als Dashboard-Bezeichnung verwendet.',

  '••••••  blank = keep': '••••••  leer = behalten',
})
