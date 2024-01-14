<template>
  <Teleport to="body">
    <div class="pruvious-floater">
      <a :href="`/${runtimeConfig.public.pruvious.dashboardPrefix}`" :title="__('pruvious-dashboard', 'Dashboard')">
        <PruviousIconAdjustmentsHorizontal class="icon" />
      </a>

      <a
        v-if="canUpdate"
        :href="`/${runtimeConfig.public.pruvious.dashboardPrefix}/collections/${collection}/${recordId}`"
        :title="__('pruvious-dashboard', 'Edit')"
      >
        <PruviousIconPencil class="icon" />
      </a>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { useRuntimeConfig, type PropType } from '#imports'
import type { CollectionName } from '#pruvious'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { useUser } from '../../composables/user'
import { pruviousFetch } from '../../utils/fetch'
import { getCapabilities } from '../../utils/users'

const props = defineProps({
  collection: {
    type: String as PropType<CollectionName>,
    required: true,
  },
  recordId: {
    type: Number,
  },
})

const dashboard = usePruviousDashboard()
const runtimeConfig = useRuntimeConfig()
const user = useUser()

const capabilities = getCapabilities(user.value)

const canUpdate =
  user.value?.isAdmin ||
  !!(
    capabilities[`collection-${props.collection}-read`] &&
    capabilities[`collection-${props.collection}-update`] &&
    capabilities['collection-previews-create'] &&
    capabilities['collection-previews-read'] &&
    capabilities['collection-previews-update']
  )

await loadTranslatableStrings('pruvious-dashboard')

if (!dashboard.value.loaded) {
  const dashboardOptions = await pruviousFetch('dashboard.get')
  dashboard.value = { ...dashboard.value, ...(dashboardOptions.success ? dashboardOptions.data : {}) }
  dashboard.value.loaded = true
}
</script>

<style>
.pruvious-floater {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 99999;
  display: flex;
  padding: 0 0.5rem;
  background-color: var(--pruvious-floater-color, white);
  box-shadow: 0 1px 6px -1px rgb(0 0 0 / 0.2), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  border-radius: 9rem;
}

.dark .pruvious-floater {
  background-color: var(--pruvious-floater-color, #10141e);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.pruvious-floater a {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--pruvious-floater-text-color, #949392);
  transition: color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.dark .pruvious-floater a {
  color: var(--pruvious-floater-text-color, #abb7ce);
}

.pruvious-floater a:hover,
.pruvious-floater a:focus {
  color: var(--pruvious-floater-focus-color, #0652dd);
}

.dark .pruvious-floater a:hover,
.dark .pruvious-floater a:focus {
  color: var(--pruvious-floater-focus-color, #2491ff);
}

.pruvious-floater a svg {
  width: 1rem;
  height: 1rem;
}
</style>
