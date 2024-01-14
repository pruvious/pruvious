<template>
  <LazyPruviousMultiCollectionsOverview v-if="collection.mode === 'multi'" />
  <LazyPruviousSingleCollectionsOverview v-if="(collection as any).mode === 'single'" />
</template>

<script lang="ts" setup>
import { useRoute } from '#imports'
import type { CollectionName } from '#pruvious'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'

const dashboard = usePruviousDashboard()
const route = useRoute()

dashboard.value.collection = route.params.collection as CollectionName

const collection = dashboard.value.collections[dashboard.value.collection!]
</script>
