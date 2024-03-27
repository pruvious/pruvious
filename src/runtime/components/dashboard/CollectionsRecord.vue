<template>
  <div>
    <PruviousCollectionsContentRecord v-if="collection.contentBuilder" v-model:record="record" :isEditing="isEditing" />
    <PruviousCollectionsSimpleRecord v-if="!collection.contentBuilder" v-model:record="record" :isEditing="isEditing" />
  </div>
</template>

<script lang="ts" setup>
import { ref, useRoute } from '#imports'
import { type CollectionName } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { navigateToPruviousDashboardPath, usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { pruviousFetch } from '../../utils/fetch'
import { isPositiveInteger } from '../../utils/number'
import { deepClone } from '../../utils/object'

const dashboard = usePruviousDashboard()
const route = useRoute()

if (dashboard.value.collections[route.params.collection as CollectionName].mode === 'multi') {
  dashboard.value.collection = route.params.collection as CollectionName
} else {
  await navigateToPruviousDashboardPath(`/404?from=${route.fullPath}`, { replace: true })
}

const collection = dashboard.value.collections[dashboard.value.collection!]
const isEditing = isPositiveInteger(+route.params.recordId)
const record = ref(<Record<string, any>>{})

const PruviousCollectionsContentRecord = dashboardMiscComponent.CollectionsContentRecord()
const PruviousCollectionsSimpleRecord = dashboardMiscComponent.CollectionsSimpleRecord()

if (isEditing) {
  const response = await pruviousFetch<Record<string, any>>(`collections/${collection.name}/${route.params.recordId}`)

  if (response.success) {
    record.value = response.data
  } else {
    await navigateToPruviousDashboardPath(`/404?from=${route.fullPath}`, { replace: true })
  }
} else if (route.params.recordId === 'create') {
  record.value = deepClone(
    Object.fromEntries(Object.entries(collection.fields).map(([fieldName, field]) => [fieldName, field.default])),
  )

  if (route.query.language) {
    record.value.language = route.query.language as string
  }
} else {
  await navigateToPruviousDashboardPath(`/404?from=${route.fullPath}`, { replace: true })
}
</script>
