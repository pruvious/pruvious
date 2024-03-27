<template>
  <div>
    <PruviousMultiCollectionsOverview v-if="collection.mode === 'multi'" />
    <PruviousSingleCollectionsOverview v-if="(collection as any).mode === 'single'" />
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from '#imports'
import type { CollectionName } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'

const dashboard = usePruviousDashboard()
const route = useRoute()

dashboard.value.collection = route.params.collection as CollectionName

const collection = dashboard.value.collections[dashboard.value.collection!]

const PruviousMultiCollectionsOverview = dashboardMiscComponent.MultiCollectionsOverview()
const PruviousSingleCollectionsOverview = dashboardMiscComponent.SingleCollectionsOverview()
</script>
