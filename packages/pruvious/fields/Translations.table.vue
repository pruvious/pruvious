<template>
  <ul class="pui-row">
    <template v-for="({ id, canCreate, canRead, canUpdate }, language) of filteredPermissions">
      <PUIButton
        v-if="id"
        v-pui-tooltip="
          canUpdate ? __('pruvious-dashboard', 'Edit translation') : __('pruvious-dashboard', 'View translation')
        "
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
  resolveTranslatableCollectionRecordPermissions,
  useDashboardContentLanguage,
  type ResolvedTranslatableCollectionRecordPermissions,
} from '#pruvious/client'
import type { Collections, SerializableCollection } from '#pruvious/server'
import type { PUICell, PUIColumns } from '@pruvious/ui/pui/table'
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
   * The name and definition of the current translatable collection.
   */
  collection: {
    type: Object as PropType<{ name: keyof Collections; definition: SerializableCollection }>,
    required: true,
  },
})

const contentLanguage = useDashboardContentLanguage()
const collectionSlug = slugify(props.collection.name)
const permissions = await resolveTranslatableCollectionRecordPermissions(+props.cell.row.id, props.collection)
const filteredPermissions = filterObject(
  permissions,
  (language) => language !== contentLanguage.value,
) as ResolvedTranslatableCollectionRecordPermissions
</script>

<style scoped>
.pui-row {
  flex-wrap: wrap;
}

.pui-uppercase {
  font-size: 0.75rem;
}
</style>
