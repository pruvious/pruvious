import { __, addFilter } from '#pruvious/app'
import { $pfetchDashboard, dashboardBasePath } from '#pruvious/dashboard'
import { puiQueueToast } from '@pruvious/ui/pui/toast'
import { canActOnTarget } from '../../utils/accessibleTargets'

addFilter('dashboard:collections:index:row:actions', (actions, { collection }) => {
  if (collection.name !== 'Deployments') {
    return actions
  }

  actions.push({
    key: 'hub-redeploy',
    icon: 'tabler:refresh',
    label: __('pruvious-dashboard', 'Redeploy'),
    visible: (row) => {
      const targetId = typeof row.target === 'object' && row.target ? row.target.id : row.target
      return canActOnTarget(targetId) && row.status !== 'queued' && row.status !== 'running'
    },
    onClick: async (row) => {
      const targetId = typeof row.target === 'object' && row.target ? row.target.id : row.target
      try {
        const { deploymentId } = (await $pfetchDashboard(`/api/hub/targets/${targetId}/deploy`, {
          method: 'POST',
        })) as { deploymentId: number }
        await navigateTo(`${dashboardBasePath}collections/deployments/${deploymentId}`)
      } catch (error: any) {
        puiQueueToast(error?.data?.statusMessage ?? error?.message ?? __('pruvious-dashboard', 'Redeploy failed'), {
          type: 'error',
        })
      }
    },
  })

  return actions
})
