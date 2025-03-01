<template>
  <PUIButton
    v-if="canLogout"
    v-pui-tooltip="__('pruvious-dashboard', 'Sign out user from all active sessions')"
    @click="logoutUser()"
    variant="outline"
  >
    <Icon :name="'tabler:plug-connected-x'" mode="svg" />
  </PUIButton>
</template>

<script lang="ts" setup>
import { __, hasPermission, pruviousDashboardPost, QueryBuilder } from '#pruvious/client'

const props = defineProps({
  /**
   * The current user ID.
   */
  id: {
    type: Number,
    required: true,
  },
})

const canLogout = hasPermission('logout-other-users')
const queryBuilder = new QueryBuilder({ fetcher: pruviousDashboardPost })

async function logoutUser() {
  const input = { tokenSubject: 'true' }
  const query = await queryBuilder.update('Users').set(input).where('id', '=', props.id).run()

  if (query.success && query.data) {
    puiQueueToast(__('pruvious-dashboard', 'Signed out'), { type: 'success' })
  } else {
    puiQueueToast(__('pruvious-dashboard', 'Action failed'), { type: 'error' })
  }
}
</script>
