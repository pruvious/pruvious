import { createPattern, defineTranslation } from '#pruvious/server'

export default defineTranslation({
  'A deployment is already queued or running for this target':
    'A deployment is already queued or running for this target',
  'A previous deployment left a stale sync lock on this target. Click to release it before the TTL expires.':
    'A previous deployment left a stale sync lock on this target. Click to release it before the TTL expires.',
  'Acquired at': 'Acquired at',
  "Absolute path on this machine to the existing Pruvious project. Pick the project's **root directory** - the one that contains `nuxt.config.ts` and a `package.json` listing `pruvious` in its dependencies. The deployer reads source from here and runs the build inside it.":
    "Absolute path on this machine to the existing Pruvious project. Pick the project's **root directory** - the one that contains `nuxt.config.ts` and a `package.json` listing `pruvious` in its dependencies. The deployer reads source from here and runs the build inside it.",
  'Allowed deployers': 'Allowed deployers',
  'API token': 'API token',
  'Auto': 'Auto',

  'Backup': 'Backup',
  'Backup database': 'Backup database',
  'Backup failed': 'Backup failed',
  'Backup full': 'Backup full',
  'Backup uploads': 'Backup uploads',
  'Backups': 'Backups',
  'Bound as `CACHE` in the Worker. Used when the project sets `pruvious.cache.driver` to `d1://CACHE`. Leave empty to fall back to the main database.':
    'Bound as `CACHE` in the Worker. Used when the project sets `pruvious.cache.driver` to `d1://CACHE`. Leave empty to fall back to the main database.',
  'Bound as `DB` in the Worker. Find the name with `npx wrangler d1 list` and the ID with `npx wrangler d1 info <name>`, or in the Cloudflare dashboard under Workers & Pages → D1. Create one with `npx wrangler d1 create <name>`.':
    'Bound as `DB` in the Worker. Find the name with `npx wrangler d1 list` and the ID with `npx wrangler d1 info <name>`, or in the Cloudflare dashboard under Workers & Pages → D1. Create one with `npx wrangler d1 create <name>`.',
  'Bound as `LOGS` in the Worker. Used when the project sets `pruvious.logs.driver` to `d1://LOGS`. Leave empty to fall back to the main database.':
    'Bound as `LOGS` in the Worker. Used when the project sets `pruvious.logs.driver` to `d1://LOGS`. Leave empty to fall back to the main database.',
  'Bound as `QUEUE` in the Worker. Used when the project sets `pruvious.queue.driver` to `d1://QUEUE` (also stores job locks). Leave empty to fall back to the main database.':
    'Bound as `QUEUE` in the Worker. Used when the project sets `pruvious.queue.driver` to `d1://QUEUE` (also stores job locks). Leave empty to fall back to the main database.',
  'Branch': 'Branch',
  'Build command': 'Build command',

  'Cache D1 database': 'Cache D1 database',
  'Cloudflare account ID': 'Cloudflare account ID',
  'Cloudflare API token. Minimum scopes for deploys: `Workers Scripts: Edit`, `Account Settings: Read`, `User Details: Read`. Add `D1: Edit` to enable database backup/restore, and `Workers R2 Storage: Edit` to enable uploads backup/restore. Create one at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens), then store it as a Secret here.':
    'Cloudflare API token. Minimum scopes for deploys: `Workers Scripts: Edit`, `Account Settings: Read`, `User Details: Read`. Add `D1: Edit` to enable database backup/restore, and `Workers R2 Storage: Edit` to enable uploads backup/restore. Create one at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens), then store it as a Secret here.',
  'Cloudflare config': 'Cloudflare config',
  'Cloudflare Workers': 'Cloudflare Workers',
  'Commit': 'Commit',

  'Database': 'Database',
  'Database driver': 'Database driver',
  'Deploy': 'Deploy',
  'Deploy failed': 'Deploy failed',
  'Deploy lock': 'Deploy lock',
  'Deployment': 'Deployment',
  'Deployment target': 'Deployment target',
  'Deployment targets': 'Deployment targets',
  'Deployments': 'Deployments',
  'Domain': 'Domain',
  'Duration': 'Duration',

  'Environment variables': 'Environment variables',
  'Expires at': 'Expires at',

  'Failed to load backup': 'Failed to load backup',
  'Failed to load deployment': 'Failed to load deployment',
  'Failed to load restore': 'Failed to load restore',
  'Failed to load scaffold': 'Failed to load scaffold',
  'Failed to load targets': 'Failed to load targets',
  'Failed to start scaffold': 'Failed to start scaffold',
  'Finished at': 'Finished at',
  'Full': 'Full',

  'Generic': 'Generic',

  'Hostname or IP of the Ubuntu server to deploy to.': 'Hostname or IP of the Ubuntu server to deploy to.',
  'Hub-side': 'Hub-side',

  'If empty, deploys whatever branch is currently checked out locally. Otherwise, the deployer runs `git checkout` + `git pull --ff-only` before building.':
    'If empty, deploys whatever branch is currently checked out locally. Otherwise, the deployer runs `git checkout` + `git pull --ff-only` before building.',
  'In worker (default)': 'In worker (default)',
  'Is secret': 'Is secret',

  'KV namespace ID': 'KV namespace ID',
  'KV namespace UUID. Find with `npx wrangler kv namespace list` or in the dashboard under Workers KV.':
    'KV namespace UUID. Find with `npx wrangler kv namespace list` or in the dashboard under Workers KV.',

  'Last deployed': 'Last deployed',
  'Last deployment status': 'Last deployment status',
  'Last used': 'Last used',
  'Live': 'Live',
  'Loading': 'Loading',
  'Log': 'Log',
  'Log path': 'Log path',
  'Logs D1 database': 'Logs D1 database',

  'Main D1 database': 'Main D1 database',
  'Must be unique within the project.': 'Must be unique within the project.',

  'Netlify': 'Netlify',
  'Netlify config': 'Netlify config',
  'Netlify personal access token. Create one at [app.netlify.com/user/applications](https://app.netlify.com/user/applications).':
    'Netlify personal access token. Create one at [app.netlify.com/user/applications](https://app.netlify.com/user/applications).',
  'Netlify site ID': 'Netlify site ID',
  'No deployment targets yet': 'No deployment targets yet',
  'No deployments yet': 'No deployments yet',
  'Node.js major version to provision (e.g., `22`). Skipped if Node is already installed.':
    'Node.js major version to provision (e.g., `22`). Skipped if Node is already installed.',
  'Node.js version': 'Node.js version',
  'Non-admin users granted permission to deploy this target. Administrators always have access. Leave empty to restrict deploys to administrators.':
    'Non-admin users granted permission to deploy this target. Administrators always have access. Leave empty to restrict deploys to administrators.',

  'Optional. Required only for org-owned projects. Team Settings → General.':
    'Optional. Required only for org-owned projects. Team Settings → General.',
  'Override the build command run by the deployer. Leave empty to auto-detect from the project lockfile (`pnpm-lock.yaml` → `pnpm run build`, `bun.lock` → `bun run build`, `yarn.lock` → `yarn build`, otherwise `npm run build`).':
    'Override the build command run by the deployer. Leave empty to auto-detect from the project lockfile (`pnpm-lock.yaml` → `pnpm run build`, `bun.lock` → `bun run build`, `yarn.lock` → `yarn build`, otherwise `npm run build`).',

  'Port': 'Port',
  'Post-build command': 'Post-build command',
  'Post-deploy command': 'Post-deploy command',
  'Pre-build command': 'Pre-build command',
  'Private SSH key with access to this server. Store it as a Secret of type `ssh-key`.':
    'Private SSH key with access to this server. Store it as a Secret of type `ssh-key`.',
  'Project': 'Project',
  'Project name': 'Project name',
  'Project Settings → General → Project ID on the Vercel dashboard.':
    'Project Settings → General → Project ID on the Vercel dashboard.',
  'Pruvious projects': 'Pruvious projects',
  "Public domain served by this target. Used by the deployer to configure the reverse proxy (nginx) and request a Let's Encrypt certificate.":
    "Public domain served by this target. Used by the deployer to configure the reverse proxy (nginx) and request a Let's Encrypt certificate.",

  'Queue D1 database': 'Queue D1 database',
  'Queued': 'Queued',

  'R2 bucket binding': 'R2 bucket binding',
  'R2 bucket name (not a URL). Create with `npx wrangler r2 bucket create <name>` or in the Cloudflare dashboard.':
    'R2 bucket name (not a URL). Create with `npx wrangler r2 bucket create <name>` or in the Cloudflare dashboard.',
  'Recent deployments': 'Recent deployments',
  'Redeploy': 'Redeploy',
  'Redeploy failed': 'Redeploy failed',
  'Restore': 'Restore',
  'Restore failed': 'Restore failed',
  'Restores': 'Restores',
  'Right sidebar of any page in the [Cloudflare dashboard](https://dash.cloudflare.com), or run `npx wrangler whoami`.':
    'Right sidebar of any page in the [Cloudflare dashboard](https://dash.cloudflare.com), or run `npx wrangler whoami`.',
  'Running': 'Running',

  'Schema sync mode': 'Schema sync mode',
  'Secret name': 'Secret name',
  'Secret type': 'Secret type',
  'Secret value (write-only, stored encrypted)': 'Secret value (write-only, stored encrypted)',
  'Secrets': 'Secrets',
  'Select a project': 'Select a project',
  'Select a secret': 'Select a secret',
  'Select a target': 'Select a target',
  'Select deployment targets': 'Select deployment targets',
  'Server': 'Server',
  'Shell snippet executed after the build, before the deploy is uploaded - after the project-level post-build command. A non-zero exit aborts the deploy.':
    'Shell snippet executed after the build, before the deploy is uploaded - after the project-level post-build command. A non-zero exit aborts the deploy.',
  'Shell snippet executed after the build, before the deploy is uploaded. A non-zero exit aborts the deploy. Runs in the project directory.':
    'Shell snippet executed after the build, before the deploy is uploaded. A non-zero exit aborts the deploy. Runs in the project directory.',
  'Shell snippet executed after the deploy finishes, after the project-level post-deploy command. Use `$DEPLOY_STATUS` (`success` or `failed`). Failures here are logged but do not change the deployment status.':
    'Shell snippet executed after the deploy finishes, after the project-level post-deploy command. Use `$DEPLOY_STATUS` (`success` or `failed`). Failures here are logged but do not change the deployment status.',
  'Shell snippet executed after the deploy finishes, regardless of outcome. Use `$DEPLOY_STATUS` (`success` or `failed`) to branch behavior; `$DEPLOY_ERROR` carries the failure message. Failures here are logged but do not change the deployment status. Also available: `$DEPLOY_ID`, `$DEPLOY_BRANCH`, `$DEPLOY_PROJECT_NAME`, `$DEPLOY_PROJECT_PATH`, `$DEPLOY_TARGET_NAME`, `$DEPLOY_TARGET_TYPE`, `$DEPLOY_TARGET_ID`.':
    'Shell snippet executed after the deploy finishes, regardless of outcome. Use `$DEPLOY_STATUS` (`success` or `failed`) to branch behavior; `$DEPLOY_ERROR` carries the failure message. Failures here are logged but do not change the deployment status. Also available: `$DEPLOY_ID`, `$DEPLOY_BRANCH`, `$DEPLOY_PROJECT_NAME`, `$DEPLOY_PROJECT_PATH`, `$DEPLOY_TARGET_NAME`, `$DEPLOY_TARGET_TYPE`, `$DEPLOY_TARGET_ID`.',
  'Shell snippet executed before the build for every target of this project. A non-zero exit aborts the deploy. Runs in the project directory with the same environment variables as the build.':
    'Shell snippet executed before the build for every target of this project. A non-zero exit aborts the deploy. Runs in the project directory with the same environment variables as the build.',
  'Shell snippet executed before the build, after the project-level pre-build command. A non-zero exit aborts the deploy. Runs in the project directory.':
    'Shell snippet executed before the build, after the project-level pre-build command. A non-zero exit aborts the deploy. Runs in the project directory.',
  'Site Configuration → General → Site ID on the Netlify dashboard.':
    'Site Configuration → General → Site ID on the Netlify dashboard.',
  'Size': 'Size',
  'Source directory': 'Source directory',
  'SSH key': 'SSH key',
  'SSH port. Default 22.': 'SSH port. Default 22.',
  'Started at': 'Started at',
  'Storage path': 'Storage path',
  'Stored encrypted at rest. Synced to the worker as a secret on each deploy.':
    'Stored encrypted at rest. Synced to the worker as a secret on each deploy.',

  'Target name': 'Target name',
  'Target type': 'Target type',
  'Targets': 'Targets',
  'Trigger a new backup for this target': 'Trigger a new backup for this target',
  'Trigger a new deployment for this target': 'Trigger a new deployment for this target',
  'Triggered by': 'Triggered by',
  'This will overwrite the current state of **$target** with the contents of this backup. This action cannot be undone.':
    createPattern(
      'This will overwrite the current state of **$target** with the contents of this backup. This action cannot be undone.',
      { target: 'string' },
    ),

  'Unique name for the Worker. Created automatically on first deploy if it does not exist.':
    'Unique name for the Worker. Created automatically on first deploy if it does not exist.',
  'Uploads': 'Uploads',

  'Value': 'Value',
  'Variable name available to the build and runtime. Convention: `UPPER_SNAKE_CASE`.':
    'Variable name available to the build and runtime. Convention: `UPPER_SNAKE_CASE`.',
  'Vercel': 'Vercel',
  'Vercel access token. Create one at [vercel.com/account/tokens](https://vercel.com/account/tokens) with full account scope, then store it as a Secret.':
    'Vercel access token. Create one at [vercel.com/account/tokens](https://vercel.com/account/tokens) with full account scope, then store it as a Secret.',
  'Vercel config': 'Vercel config',
  'Vercel project ID': 'Vercel project ID',
  'Vercel team ID': 'Vercel team ID',
  'VPS': 'VPS',
  'VPS config': 'VPS config',

  'When the provider supports it, secrets sync as encrypted, non-retrievable bindings (Cloudflare `wrangler secret put`, Vercel/Netlify sensitive env vars). Non-secrets sync as plain variables visible in the provider dashboard (Cloudflare `[vars]` block). On VPS this only affects log masking.':
    'When the provider supports it, secrets sync as encrypted, non-retrievable bindings (Cloudflare `wrangler secret put`, Vercel/Netlify sensitive env vars). Non-secrets sync as plain variables visible in the provider dashboard (Cloudflare `[vars]` block). On VPS this only affects log masking.',
  'Where the database schema sync runs. `In worker` runs sync on the deployed worker at first request (default, matches existing behaviour). `Hub-side` runs sync in the hub between build and deploy by pulling D1 to a local SQLite file, syncing, then pushing back - use this when in-worker sync exceeds Cloudflare timeouts.':
    'Where the database schema sync runs. `In worker` runs sync on the deployed worker at first request (default, matches existing behaviour). `Hub-side` runs sync in the hub between build and deploy by pulling D1 to a local SQLite file, syncing, then pushing back - use this when in-worker sync exceeds Cloudflare timeouts.',
  'Which database the app will run against on this server.': 'Which database the app will run against on this server.',
  'Worker name': 'Worker name',
  'Workspace': 'Workspace',

  'Absolute path on this hub machine. The project is created in `<parent>/<slugified-name>`.':
    'Absolute path on this hub machine. The project is created in `<parent>/<slugified-name>`.',
  'Add existing': 'Add existing',

  'BCP-47, e.g. `en`, `de-AT`.': 'BCP-47, e.g. `en`, `de-AT`.',

  'Cancel': 'Cancel',

  'Install dependencies after scaffolding': 'Install dependencies after scaffolding',

  'Language code': 'Language code',
  'Language name': 'Language name',

  'my-pruvious-app': 'my-pruvious-app',

  'Overwrite if target exists': 'Overwrite if target exists',

  'Package manager': 'Package manager',
  'Parent directory': 'Parent directory',
  'Pruvious version or dist-tag': 'Pruvious version or dist-tag',

  'Retry': 'Retry',
  'Run the scaffold again with the same settings (overwrites the partial directory)':
    'Run the scaffold again with the same settings (overwrites the partial directory)',

  'Scaffold': 'Scaffold',
  'Scaffold new project': 'Scaffold new project',
  'Scaffolding': 'Scaffolding',
  'Scaffolds': 'Scaffolds',
  'Select parent directory': 'Select parent directory',

  'Target directory': 'Target directory',

  "Used as the npm `name` in the new project's `package.json` and as the dashboard label.":
    "Used as the npm `name` in the new project's `package.json` and as the dashboard label.",

  '••••••  blank = keep': '••••••  blank = keep',
})
