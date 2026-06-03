import { __, addFilter } from '#pruvious/app'
import { $pfetchDashboard, dashboardBasePath } from '#pruvious/dashboard'
import { puiDialog } from '@pruvious/ui/pui/dialog'
import { puiQueueToast } from '@pruvious/ui/pui/toast'
import { canActOnTarget, getAccessibleTargets } from '../../utils/accessibleTargets'

void getAccessibleTargets()

addFilter('dashboard:collections:edit:footer:buttons', (components, { collection }) => {
  if (collection.name === 'DeploymentTargets') {
    components.push(defineAsyncComponent(() => import('../../components/Pruvious/Dashboard/DeployTargetButton.vue')))
    components.push(defineAsyncComponent(() => import('../../components/Pruvious/Dashboard/BackupTargetButton.vue')))
  }
  return components
})

addFilter('dashboard:collections:index:row:actions', (actions, { collection }) => {
  if (collection.name !== 'DeploymentTargets') {
    return actions
  }

  actions.push({
    key: 'hub-deploy',
    icon: 'tabler:cloud-upload',
    label: __('pruvious-dashboard', 'Deploy'),
    visible: (row) => canActOnTarget(row.id),
    onClick: async (row) => {
      try {
        const { deploymentId } = (await $pfetchDashboard(`/api/hub/targets/${row.id}/deploy`, {
          method: 'POST',
        })) as { deploymentId: number }
        await navigateTo(`${dashboardBasePath}collections/deployments/${deploymentId}`)
      } catch (error: any) {
        puiQueueToast(error?.data?.statusMessage ?? error?.message ?? __('pruvious-dashboard', 'Deploy failed'), {
          type: 'error',
        })
      }
    },
  })

  for (const type of ['db', 'uploads', 'full'] as const) {
    actions.push({
      key: `hub-backup-${type}`,
      icon: type === 'db' ? 'tabler:database' : type === 'uploads' ? 'tabler:files' : 'tabler:package-export',
      label:
        type === 'db'
          ? __('pruvious-dashboard', 'Backup database')
          : type === 'uploads'
            ? __('pruvious-dashboard', 'Backup uploads')
            : __('pruvious-dashboard', 'Backup full'),
      visible: (row) => canActOnTarget(row.id),
      onClick: async (row) => {
        try {
          const { backupId } = (await $pfetchDashboard(`/api/hub/targets/${row.id}/backup`, {
            method: 'POST',
            body: { type },
          })) as { backupId: number }
          await navigateTo(`${dashboardBasePath}collections/backups/${backupId}`)
        } catch (error: any) {
          puiQueueToast(error?.data?.statusMessage ?? error?.message ?? __('pruvious-dashboard', 'Backup failed'), {
            type: 'error',
          })
        }
      },
    })
  }

  return actions
})
