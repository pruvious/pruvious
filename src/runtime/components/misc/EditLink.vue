<template>
  <LazyPruviousEditLinkContent
    v-if="visible"
    :collection="collection ?? page?.collection!"
    :recordId="recordId ?? page?.id"
  />
</template>

<script lang="ts" setup>
import { ref, type PropType } from '#imports'
import type { CollectionName, UserCapability } from '#pruvious'
import { useAuth } from '../../composables/auth'
import { usePage } from '../../composables/page'
import { useUser } from '../../composables/user'
import { pruviousFetch } from '../../utils/fetch'
import { getCapabilities } from '../../utils/users'

defineProps({
  collection: {
    type: String as PropType<CollectionName>,
  },
  recordId: {
    type: Number,
  },
})

const auth = useAuth()
const page = usePage()
const user = useUser()

const capabilities = ref<Partial<Record<UserCapability, true>>>({})
const visible = ref(false)

if (process.client && window.top === window.self) {
  if (auth.value.isLoggedIn && !user.value) {
    const response = await pruviousFetch('profile.get')

    if (response.success) {
      user.value = response.data
    } else {
      auth.value.isLoggedIn = false
      auth.value.userId = null
    }
  }

  capabilities.value = getCapabilities(user.value)
  visible.value = user.value?.isAdmin || !!capabilities.value['access-dashboard']
}
</script>
