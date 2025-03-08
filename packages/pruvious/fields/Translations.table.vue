<template>
  <ul class="pui-row">
    <template v-for="({ id, canCreate, canRead, canUpdate }, language) of filteredPermissions">
      <PUIButton
        v-if="id"
        v-pui-tooltip="canUpdate ? __('pruvious-dashboard', 'Edit') : __('pruvious-dashboard', 'View')"
        :disabled="!canRead && !canUpdate"
        :size="-3"
        :to="dashboardBasePath + `collections/${collectionSlug}/${id}`"
        variant="outline"
      >
        <span class="pui-uppercase">{{ language }}</span>
        <Icon v-if="canUpdate" mode="svg" name="tabler:pencil" />
        <Icon v-else mode="svg" name="tabler:list-search" />
      </PUIButton>

      <PUIButton
        v-else-if="!id"
        v-pui-tooltip="__('pruvious-dashboard', 'New translation')"
        :disabled="!canCreate"
        :size="-3"
        :to="dashboardBasePath + `collections/${collectionSlug}/new?translationOf=${cell.row.id}&language=${language}`"
        variant="primary"
      >
        <span class="pui-uppercase">{{ language }}</span>
        <Icon mode="svg" name="tabler:note" />
      </PUIButton>
    </template>
  </ul>
</template>

<script lang="ts" setup>
import {
  __,
  dashboardBasePath,
  resolveCollectionRecordPermissions,
  useDashboardContentLanguage,
  usePruviousDashboard,
  type ResolvedCollectionRecordPermissions,
} from '#pruvious/client'
import type { Collections } from '#pruvious/server'
import { filterObject, slugify } from '@pruvious/utils'

const props = defineProps({
  /**
   * The table cell props containing the row data, column definition, and other cell-related information.
   */
  cell: {
    type: Object as PropType<PUICell<PUIColumns>>,
    required: true,
  },

  /**
   * The casted field value.
   */
  modelValue: {
    type: [String, null],
    required: true,
  },

  /**
   * The name of the current collection in PascalCase format.
   */
  collectionName: {
    type: String as PropType<keyof Collections>,
    required: true,
  },
})

const dashboard = usePruviousDashboard()
const contentLanguage = useDashboardContentLanguage()
const collectionDefinition = dashboard.value!.collections[props.collectionName]!
const collectionSlug = slugify(props.collectionName)
const permissions = await resolveCollectionRecordPermissions(+props.cell.row.id, {
  name: props.collectionName,
  definition: collectionDefinition,
})
const filteredPermissions = filterObject(
  permissions,
  (language) => language !== contentLanguage.value,
) as ResolvedCollectionRecordPermissions
</script>

<style scoped>
.pui-row {
  flex-wrap: wrap;
}

.pui-uppercase {
  font-size: 0.75rem;
}
</style>
