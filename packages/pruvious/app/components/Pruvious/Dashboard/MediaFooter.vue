<template>
  <div class="pui-justify-between">
    <PUIPagination
      :currentPage="state.page"
      :goToPageTitle="__('pruvious-dashboard', 'Go to page')"
      :lastPage="state.lastPage"
      :nextPageTitle="__('pruvious-dashboard', 'Next page')"
      :pageLabel="__('pruvious-dashboard', 'Page')"
      :previousPageTitle="__('pruvious-dashboard', 'Previous page')"
      @change="(page) => $emit('update:state', { ...state, page })"
    >
      <template #button="{ currentPage, index, onClick }">
        <button
          v-pui-tooltip="
            __('pruvious-dashboard', 'Showing entries $from to $to', {
              from: (index - 1) * state.perPage + 1,
              to: Math.min(index * state.perPage, state.total),
              total: state.total,
            })
          "
          @click="onClick()"
          type="button"
          class="pui-pagination-button pui-raw"
          :class="{ 'pui-pagination-button-active': currentPage === index }"
        >
          {{ index }}
        </button>
      </template>
    </PUIPagination>

    <div class="pui-row pui-ml-auto">
      <PUIButton
        v-pui-tooltip="__('pruvious-dashboard', 'Configure view')"
        :variant="isDirty ? 'accent' : 'outline'"
        @click="isTableSettingsPopupVisible = true"
      >
        <Icon mode="svg" name="tabler:adjustments" />
        <template v-if="isDirty" #bubble>
          <PUIBubble></PUIBubble>
        </template>
      </PUIButton>

      <PruviousDashboardCreateUploadActions :state="state" />
    </div>

    <PruviousDashboardTableSettingsPopup
      v-if="isTableSettingsPopupVisible"
      :collection="collection"
      :columns="columns"
      :defaultColumns="columns"
      :defaultOrderBy="defaultParams.orderBy"
      :paginated="{ currentPage: state.page, perPage: state.perPage, lastPage: state.lastPage, total: state.total }"
      :params="{ where: state.where, orderBy: state.orderBy }"
      :size="-1"
      @close="$event().then(() => (isTableSettingsPopupVisible = false))"
      @update:params="
        (params) => $emit('update:state', { ...state, where: params.where as any, orderBy: params.orderBy as any })
      "
      hideColumnsTab
      width="64rem"
    />
  </div>
</template>

<script lang="ts" setup>
import { __, maybeTranslate, usePruviousDashboard, type DashboardMediaLibraryState } from '#pruvious/client'
import { puiHasModifierKey, puiIsEditingText } from '@pruvious/ui/pui/hotkeys'
import { usePUIOverlayCounter } from '@pruvious/ui/pui/overlay'
import { puiColumn, type PUIColumns } from '@pruvious/ui/pui/table'
import { isDefined, isObject, remap, titleCase } from '@pruvious/utils'
import { onKeyStroke } from '@vueuse/core'

const props = defineProps({
  state: {
    type: Object as PropType<DashboardMediaLibraryState>,
    required: true,
  },
  defaultParams: {
    type: Object as PropType<Pick<DashboardMediaLibraryState, 'where' | 'orderBy' | 'page' | 'perPage'>>,
    required: true,
  },
  isDirty: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits<{
  'update:state': [DashboardMediaLibraryState]
}>()

const dashboard = usePruviousDashboard()
const collection = {
  name: 'Uploads' as const,
  definition: dashboard.value!.collections.Uploads!,
}
const overlayCounter = usePUIOverlayCounter()
const currentOverlayCounter = overlayCounter.value
const isTableSettingsPopupVisible = ref(false)
const columns = resolveColumns()

onKeyStroke('ArrowLeft', (e) => {
  if (
    !puiHasModifierKey(e) &&
    !puiIsEditingText() &&
    overlayCounter.value === currentOverlayCounter &&
    props.state.page > 1
  ) {
    e.preventDefault()
    emit('update:state', { ...props.state, page: props.state.page - 1 })
  }
})

onKeyStroke('ArrowRight', (e) => {
  if (
    !puiHasModifierKey(e) &&
    !puiIsEditingText() &&
    overlayCounter.value === currentOverlayCounter &&
    props.state.page < props.state.lastPage
  ) {
    e.preventDefault()
    emit('update:state', { ...props.state, page: props.state.page + 1 })
  }
})

function resolveColumns(): PUIColumns {
  return remap(collection.definition.fields, (fieldName, options) => [
    fieldName,
    puiColumn({
      label:
        'ui' in options && isDefined(options.ui?.label)
          ? maybeTranslate(options.ui.label)
          : __('pruvious-dashboard', titleCase(fieldName, false) as any),
      sortable:
        options.ui?.dataTable === false || (isObject(options.ui?.dataTable) && options.ui.dataTable.sortable === false)
          ? false
          : options._dataType === 'text'
            ? 'text'
            : 'numeric',
      minWidth: '16rem',
    }),
  ])
}
</script>

<style scoped>
:deep(.pui-pagination-buttons) {
  margin: -0.75rem -0.25rem;
  padding: 0.75rem 0.25rem;
}
</style>
