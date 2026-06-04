import {
  defineCollection,
  nullableObjectField,
  nullableSelectField,
  nullableTextField,
  numberField,
  objectField,
  recordField,
  recordsField,
  selectField,
  textAreaField,
  textField,
  timestampField,
} from '#pruvious/server'
import { cleanupTargetCascade } from '../utils/cleanupTargetCascade'
import { scopeDeploymentTargetsByDeployer } from '../utils/deployScopeHook'

const targetCascade = cleanupTargetCascade()

export default defineCollection({
  fields: {
    project: recordField({
      collection: 'Projects',
      required: true,
      foreignKey: 'cascade',
      fields: ['id', 'name', 'path'],
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Project'),
        placeholder: ({ __ }) => __('pruvious-dashboard', 'Select a project'),
        displayFields: ['name', 'path'],
        searchFields: ['name', 'path'],
      },
    }),
    name: textField({
      required: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Target name'),
        placeholder: 'app.example.com',
        description: ({ __ }) => __('pruvious-dashboard', 'Must be unique within the project.'),
      },
    }),
    type: selectField({
      required: true,
      default: 'cloudflare',
      choices: [
        { value: 'cloudflare', label: ({ __ }) => __('pruvious-dashboard', 'Cloudflare Workers') },
        // { value: 'netlify', label: ({ __ }) => __('pruvious-dashboard', 'Netlify') },
        // { value: 'vercel', label: ({ __ }) => __('pruvious-dashboard', 'Vercel') },
        { value: 'vps', label: ({ __ }) => __('pruvious-dashboard', 'VPS') },
      ],
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Target type'),
      },
    }),
    syncLock: nullableObjectField({
      subfields: {
        deploymentId: numberField({
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Deployment'),
          },
        }),
        acquiredAt: timestampField({
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Acquired at'),
          },
        }),
        expiresAt: timestampField({
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Expires at'),
          },
        }),
      },
      ui: {
        hidden: true,
        label: ({ __ }) => __('pruvious-dashboard', 'Deploy lock'),
      },
    }),
    branch: nullableTextField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Branch'),
        placeholder: 'main',
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'If empty, deploys whatever branch is currently checked out locally. Otherwise, the deployer runs `git checkout` + `git pull --ff-only` before building.',
          ),
      },
    }),
    cloudflareConfig: objectField({
      conditionalLogic: { type: { '=': 'cloudflare' } },
      subfields: {
        accountId: textField({
          required: true,
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Cloudflare account ID'),
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Right sidebar of any page in the [Cloudflare dashboard](https://dash.cloudflare.com), or run `npx wrangler whoami`.',
              ),
          },
        }),
        workerName: textField({
          required: true,
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Worker name'),
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Unique name for the Worker. Created automatically on first deploy if it does not exist.',
              ),
          },
        }),
        apiToken: recordField({
          collection: 'Secrets',
          required: true,
          fields: ['id', 'name', 'type'],
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'API token'),
            placeholder: ({ __ }) => __('pruvious-dashboard', 'Select a secret'),
            displayFields: ['name', 'type'],
            searchFields: ['name'],
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Cloudflare API token. Minimum scopes for deploys: `Workers Scripts: Edit`, `Account Settings: Read`, `User Details: Read`. Add `D1: Edit` to enable database backup/restore, and `Workers R2 Storage: Edit` to enable uploads backup/restore. Create one at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens), then store it as a Secret here.',
              ),
          },
        }),
        d1Database: nullableObjectField({
          subfields: {
            name: textField({
              required: true,
              ui: {
                label: ({ __ }) => __('pruvious-dashboard', 'Name'),
                placeholder: 'pruvious_prod',
              },
            }),
            id: textField({
              required: true,
              ui: {
                label: ({ __ }) => __('pruvious-dashboard', 'ID'),
                placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
              },
            }),
          },
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Main D1 database'),
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Bound as `DB` in the Worker. Find the name with `npx wrangler d1 list` and the ID with `npx wrangler d1 info <name>`, or in the Cloudflare dashboard under Workers & Pages → D1. Create one with `npx wrangler d1 create <name>`.',
              ),
            subfieldsLayout: [{ row: ['name', 'id'] }],
          },
        }),
        d1Cache: nullableObjectField({
          subfields: {
            name: textField({
              required: true,
              ui: {
                label: ({ __ }) => __('pruvious-dashboard', 'Name'),
                placeholder: 'pruvious_cache',
              },
            }),
            id: textField({
              required: true,
              ui: {
                label: ({ __ }) => __('pruvious-dashboard', 'ID'),
                placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
              },
            }),
          },
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Cache D1 database'),
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Bound as `CACHE` in the Worker. Used when the project sets `pruvious.cache.driver` to `d1://CACHE`. Leave empty to fall back to the main database.',
              ),
            subfieldsLayout: [{ row: ['name', 'id'] }],
          },
        }),
        d1Queue: nullableObjectField({
          subfields: {
            name: textField({
              required: true,
              ui: {
                label: ({ __ }) => __('pruvious-dashboard', 'Name'),
                placeholder: 'pruvious_queue',
              },
            }),
            id: textField({
              required: true,
              ui: {
                label: ({ __ }) => __('pruvious-dashboard', 'ID'),
                placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
              },
            }),
          },
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Queue D1 database'),
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Bound as `QUEUE` in the Worker. Used when the project sets `pruvious.queue.driver` to `d1://QUEUE` (also stores job locks). Leave empty to fall back to the main database.',
              ),
            subfieldsLayout: [{ row: ['name', 'id'] }],
          },
        }),
        d1Logs: nullableObjectField({
          subfields: {
            name: textField({
              required: true,
              ui: {
                label: ({ __ }) => __('pruvious-dashboard', 'Name'),
                placeholder: 'pruvious_logs',
              },
            }),
            id: textField({
              required: true,
              ui: {
                label: ({ __ }) => __('pruvious-dashboard', 'ID'),
                placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
              },
            }),
          },
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Logs D1 database'),
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Bound as `LOGS` in the Worker. Used when the project sets `pruvious.logs.driver` to `d1://LOGS`. Leave empty to fall back to the main database.',
              ),
            subfieldsLayout: [{ row: ['name', 'id'] }],
          },
        }),
        r2Bucket: nullableTextField({
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'R2 bucket binding'),
            placeholder: 'pruvious-uploads',
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'R2 bucket name (not a URL). Create with `npx wrangler r2 bucket create <name>` or in the Cloudflare dashboard.',
              ),
          },
        }),
        kvNamespace: nullableTextField({
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'KV namespace ID'),
            placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'KV namespace UUID. Find with `npx wrangler kv namespace list` or in the dashboard under Workers KV.',
              ),
          },
        }),
        syncMode: selectField({
          required: true,
          default: 'in-worker',
          choices: [
            { value: 'in-worker', label: ({ __ }) => __('pruvious-dashboard', 'In worker (default)') },
            { value: 'hub-side', label: ({ __ }) => __('pruvious-dashboard', 'Hub-side') },
          ],
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Schema sync mode'),
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Where the database schema sync runs. `In worker` runs sync on the deployed worker at first request (default, matches existing behaviour). `Hub-side` runs sync in the hub between build and deploy by pulling D1 to a local SQLite file, syncing, then pushing back - use this when in-worker sync exceeds Cloudflare timeouts.',
              ),
          },
        }),
      },
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Cloudflare config'),
      },
    }),
    vercelConfig: objectField({
      conditionalLogic: { type: { '=': 'vercel' } },
      subfields: {
        projectId: textField({
          required: true,
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Vercel project ID'),
            description: ({ __ }) =>
              __('pruvious-dashboard', 'Project Settings → General → Project ID on the Vercel dashboard.'),
          },
        }),
        teamId: nullableTextField({
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Vercel team ID'),
            description: ({ __ }) =>
              __('pruvious-dashboard', 'Optional. Required only for org-owned projects. Team Settings → General.'),
          },
        }),
        apiToken: recordField({
          collection: 'Secrets',
          required: true,
          fields: ['id', 'name', 'type'],
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'API token'),
            placeholder: ({ __ }) => __('pruvious-dashboard', 'Select a secret'),
            displayFields: ['name', 'type'],
            searchFields: ['name'],
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Vercel access token. Create one at [vercel.com/account/tokens](https://vercel.com/account/tokens) with full account scope, then store it as a Secret.',
              ),
          },
        }),
      },
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Vercel config'),
      },
    }),
    netlifyConfig: objectField({
      conditionalLogic: { type: { '=': 'netlify' } },
      subfields: {
        siteId: textField({
          required: true,
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Netlify site ID'),
            description: ({ __ }) =>
              __('pruvious-dashboard', 'Site Configuration → General → Site ID on the Netlify dashboard.'),
          },
        }),
        apiToken: recordField({
          collection: 'Secrets',
          required: true,
          fields: ['id', 'name', 'type'],
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'API token'),
            placeholder: ({ __ }) => __('pruvious-dashboard', 'Select a secret'),
            displayFields: ['name', 'type'],
            searchFields: ['name'],
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Netlify personal access token. Create one at [app.netlify.com/user/applications](https://app.netlify.com/user/applications).',
              ),
          },
        }),
      },
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Netlify config'),
      },
    }),
    vpsConfig: objectField({
      conditionalLogic: { type: { '=': 'vps' } },
      subfields: {
        domain: textField({
          required: true,
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Domain'),
            placeholder: 'app.example.com',
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                "Public domain served by this target. Used by the deployer to configure the reverse proxy (nginx) and request a Let's Encrypt certificate.",
              ),
          },
        }),
        host: textField({
          required: true,
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Server'),
            placeholder: 'host.example.com',
            description: ({ __ }) => __('pruvious-dashboard', 'Hostname or IP of the Ubuntu server to deploy to.'),
          },
        }),
        sshUser: textField({
          required: true,
          default: 'root',
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'SSH user'),
            placeholder: 'root',
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'SSH login user. Must have passwordless sudo so the deployer can install nginx, certbot, Node.js, PM2, and (optionally) PostgreSQL.',
              ),
          },
        }),
        port: numberField({
          default: 22,
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Port'),
            description: ({ __ }) => __('pruvious-dashboard', 'SSH port. Default 22.'),
          },
        }),
        nodeVersion: nullableTextField({
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Node.js version'),
            placeholder: '22',
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Node.js major version to provision (e.g., `22`). Skipped if Node is already installed.',
              ),
          },
        }),
        dbDriver: selectField({
          default: 'sqlite',
          choices: [
            { value: 'sqlite', label: 'SQLite' },
            { value: 'postgres', label: 'PostgreSQL' },
          ],
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Database driver'),
            description: ({ __ }) =>
              __('pruvious-dashboard', 'Which database the app will run against on this server.'),
          },
        }),
        sshKey: recordField({
          collection: 'Secrets',
          required: true,
          fields: ['id', 'name', 'type'],
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'SSH key'),
            placeholder: ({ __ }) => __('pruvious-dashboard', 'Select a secret'),
            displayFields: ['name', 'type'],
            searchFields: ['name'],
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Private SSH key with access to this server. Store it as a Secret of type `ssh-key`.',
              ),
          },
        }),
        // `0` means "not yet allocated"; the deployer assigns a real port on first deploy.
        allocatedPort: numberField({
          default: 0,
          ui: {
            hidden: true,
            label: ({ __ }) => __('pruvious-dashboard', 'Allocated port'),
          },
        }),
      },
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'VPS config'),
      },
    }),
    preBuildCommand: textAreaField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Pre-build command'),
        placeholder: 'git pull --ff-only',
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'Shell snippet executed before the build, after the project-level pre-build command. A non-zero exit aborts the deploy. Runs in the project directory.',
          ),
      },
    }),
    postBuildCommand: textAreaField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Post-build command'),
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'Shell snippet executed after the build, before the deploy is uploaded - after the project-level post-build command. A non-zero exit aborts the deploy.',
          ),
      },
    }),
    postDeployCommand: textAreaField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Post-deploy command'),
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'Shell snippet executed after the deploy finishes, after the project-level post-deploy command. Use `$DEPLOY_STATUS` (`success` or `failed`). Failures here are logged but do not change the deployment status.',
          ),
      },
    }),
    deployers: recordsField({
      collection: 'Users',
      fields: ['id', 'email'],
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Allowed deployers'),
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'Non-admin users granted permission to deploy this target. Administrators always have access. Leave empty to restrict deploys to administrators.',
          ),
        displayFields: 'email',
        searchFields: ['email'],
      },
    }),
    lastDeployedAt: timestampField({
      ui: {
        hidden: true,
        label: ({ __ }) => __('pruvious-dashboard', 'Last deployed'),
      },
    }),
    lastDeploymentStatus: nullableSelectField({
      choices: [
        { value: 'success', label: ({ __ }) => __('pruvious-dashboard', 'Success') },
        { value: 'failed', label: ({ __ }) => __('pruvious-dashboard', 'Failed') },
        { value: 'running', label: ({ __ }) => __('pruvious-dashboard', 'Running') },
      ],
      ui: {
        hidden: true,
        label: ({ __ }) => __('pruvious-dashboard', 'Last deployment status'),
      },
    }),
  },
  indexes: [{ fields: ['project', 'name'], unique: true }],
  translatable: false,
  hooks: {
    beforeQueryPreparation: [scopeDeploymentTargetsByDeployer()],
    beforeQueryExecution: [targetCascade.before],
    afterQueryExecution: [targetCascade.after],
  },
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Deployment targets'),
    icon: 'rocket',
    menu: {
      group: 'general',
      order: 3,
    },
    indexPage: {
      dataTable: {
        columns: ['name | 180px', 'project | 200px', 'type | 160px', 'lastDeployedAt | 160px'],
        orderBy: 'name:asc',
      },
    },
  },
})
