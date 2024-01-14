<template>
  <button
    v-if="canUpdate"
    v-pruvious-tooltip="__('pruvious-dashboard', 'Log out user from all active sessions')"
    @click="logout()"
    type="button"
    class="button button-white button-square"
  >
    <PruviousIconShieldLock />
  </button>
</template>

<script lang="ts" setup>
import { type PropType } from '#imports'
import { navigateToPruviousDashboardPath } from '../../composables/dashboard/dashboard'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { removeToken } from '../../composables/token'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { useUser } from '../../composables/user'
import { pruviousFetch } from '../../utils/fetch'
import { getCapabilities } from '../../utils/users'

const props = defineProps({
  record: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
})

const user = useUser()
const userCapabilities = getCapabilities(user.value)

const canUpdate = user.value?.isAdmin || userCapabilities['collection-users-update']

await loadTranslatableStrings('pruvious-dashboard')

async function logout() {
  const response = await pruviousFetch('logout-all.post', { query: { id: props.record.id } })

  if (response.success) {
    pruviousToasterShow({
      message: __('pruvious-dashboard', 'The user has been logged out from all active sessions'),
      afterRouteChange: true,
    })

    if (user.value?.id === props.record.id) {
      removeToken()
      await navigateToPruviousDashboardPath('/')
    }
  }
}
</script>
