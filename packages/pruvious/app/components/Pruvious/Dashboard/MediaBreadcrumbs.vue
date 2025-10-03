<template>
  <div class="pui-row">
    <span v-if="!breadcrumbs.length" class="p-media-breadcrumb p-media-breadcrumb-active pui-shrink-0">
      {{ __('pruvious-dashboard', 'Media') }}
    </span>
    <NuxtLink
      v-else="!breadcrumbs.length"
      :to="dashboardBasePath + 'media' + queryString"
      class="p-media-breadcrumb pui-shrink-0"
    >
      {{ __('pruvious-dashboard', 'Media') }}
    </NuxtLink>
    <template v-for="(breadcrumb, index) in breadcrumbs" :key="index">
      <span class="p-media-breadcrumb-separator pui-shrink-0">/</span>
      <span
        v-if="index === breadcrumbs.length - 1"
        :title="breadcrumb"
        class="p-media-breadcrumb p-media-breadcrumb-active pui-shrink-0"
      >
        {{ breadcrumb }}
      </span>
      <NuxtLink
        v-else
        :title="breadcrumb"
        :to="dashboardBasePath + 'media/' + breadcrumbs.slice(0, index + 1).join('/') + queryString"
        class="p-media-breadcrumb pui-truncate"
      >
        {{ breadcrumb }}
      </NuxtLink>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { __, dashboardBasePath, type DashboardMediaLibraryState } from '#pruvious/client'
import { isStringInteger } from '@pruvious/utils'

const props = defineProps({
  state: {
    type: Object as PropType<DashboardMediaLibraryState>,
    required: true,
  },
})

const route = useRoute()
const breadcrumbs = computed(() =>
  props.state.currentDirectory === '/' ? [] : props.state.currentDirectory.split('/').filter(Boolean),
)
const queryString = computed(() => {
  const params = { ...route.query }
  const page = isStringInteger(params.page) ? +params.page : 1
  if (page > 1) {
    delete params.page
  }
  const qs = new URLSearchParams(params as Record<string, string>).toString()
  return qs ? `?${qs}` : ''
})
</script>

<style scoped>
.p-media-breadcrumb {
  width: auto;
  text-decoration: none;
}

.p-media-breadcrumb:not(.p-media-breadcrumb-active),
.p-media-breadcrumb-separator {
  color: hsl(var(--pui-muted-foreground));
}

.p-media-breadcrumb:not(.p-media-breadcrumb-active):hover,
.p-media-breadcrumb:not(.p-media-breadcrumb-active):focus {
  color: hsl(var(--pui-foreground));
}
</style>
