import { __, addFilter } from '#pruvious/app'
import { $pfetchDashboard, dashboardBasePath } from '#pruvious/dashboard'
import { puiDialog } from '@pruvious/ui/pui/dialog'
import { puiQueueToast } from '@pruvious/ui/pui/toast'
import { canActOnTarget } from '../../utils/accessibleTargets'

addFilter('dashboard:collections:index:row:actions', (actions, { collection }) => {
  if (collection.name !== 'Backups') {
    return actions
  }

  actions.push({
    key: 'hub-restore',
    icon: 'tabler:database-import',
    label: __('pruvious-dashboard', 'Restore'),
    visible: (row) => {
      const targetId = typeof row.target === 'object' && row.target ? row.target.id : row.target
      return canActOnTarget(targetId) && row.status === 'success'
    },
    destructive: true,
    onClick: async (row) => {
      const targetName = typeof row.target === 'object' && row.target ? row.target.name : ''
      const action = await puiDialog({
        content: __(
          'pruvious-dashboard',
          'This will overwrite the current state of **$target** with the contents of this backup. This action cannot be undone.',
          { target: targetName || `#${row.target}` },
        ),
        actions: [
          { name: 'cancel', label: __('pruvious-dashboard', 'Cancel') },
          { name: 'restore', label: __('pruvious-dashboard', 'Restore'), variant: 'destructive' },
        ],
      })

      if (action !== 'restore') {
        return
      }

      try {
        const { restoreId } = (await $pfetchDashboard(`/api/hub/backups/${row.id}/restore`, {
          method: 'POST',
          body: { confirm: true, wipeMissingObjects: true },
        })) as { restoreId: number }
        await navigateTo(`${dashboardBasePath}collections/restores/${restoreId}`)
      } catch (error: any) {
        puiQueueToast(error?.data?.statusMessage ?? error?.message ?? __('pruvious-dashboard', 'Restore failed'), {
          type: 'error',
        })
      }
    },
  })

  return actions
})
