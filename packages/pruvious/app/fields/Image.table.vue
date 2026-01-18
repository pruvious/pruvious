<template>
  <div>
    <PruviousDashboardEditableFieldCell :cell="cell" :editable="editable" :name="name">
      <template v-if="modelValue">
        <span v-if="!canRead">{{ modelValue }}</span>

        <div
          v-else-if="file && showThumbnail"
          v-pui-tooltip="file.path"
          class="p-item p-image-preview p-media-item-box"
        >
          <PruviousDashboardMediaImageItem
            v-if="file.category === 'image' && displayableImageTypes[file.mime]"
            :linkHandler="
              (_, event) => {
                if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
                  isDetailsPopupVisible = true
                }
              }
            "
            :upload="file"
            compact
          />
          <PruviousDashboardMediaFileItem
            v-else-if="!loadingFile"
            :linkHandler="
              (_, event) => {
                if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
                  isDetailsPopupVisible = true
                }
              }
            "
            :upload="file"
            compact
          />
        </div>

        <a
          v-else-if="file"
          v-pui-tooltip="file.path"
          :href="`${dashboardBasePath}media${dir === '/' ? '' : dir}?details=${file.id}`"
          @click="
            (event) => {
              if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
                event.preventDefault()
                isDetailsPopupVisible = true
              }
            }
          "
          target="_blank"
          class="p-item"
        >
          <PruviousDashboardMediaFileName :path="file.path" :title="__('pruvious-dashboard', 'Show details')" />
        </a>

        <span
          v-else-if="!loadingFile"
          :title="__('pruvious-dashboard', 'Image not found') + ` (#${modelValue})`"
          class="pui-truncate"
        >
          {{ __('pruvious-dashboard', 'Image not found') + ` (#${modelValue})` }}
        </span>
      </template>

      <span v-else>-</span>
    </PruviousDashboardEditableFieldCell>

    <PruviousDashboardMediaItemDetailsPopup
      v-if="isDetailsPopupVisible && file"
      :resolvedPermissions="resolvedPermissions"
      :upload="file"
      @close="$event().then(() => (isDetailsPopupVisible = false))"
      @data="file = $event"
      @deselect="
        async () => {
          await refresh?.(true)
          file = await fetchFileData()
        }
      "
    />

    <PruviousDashboardEditTableFieldPopup
      v-if="isEditPopupVisible"
      :cell="cell"
      :collection="collection"
      :disabled="!editable"
      :modelValue="modelValue"
      :name="name"
      :onInit="
        () => {
          provide('openLinksInNewTab', true)
          provide('hideViewConfiguration', true)
          provide('hideEditableFieldCellActions', true)
        }
      "
      :options="options"
      @close="$event().then(() => (isEditPopupVisible = false))"
      @updated="refresh?.(true)"
    />
  </div>
</template>

<script lang="ts" setup>
import { __, dashboardBasePath, hasPermission } from '#pruvious/app'
import {
  displayableImageTypes,
  selectFrom,
  useCollectionRecordPermissions,
  usePruviousDashboard,
  type UploadItem,
} from '#pruvious/dashboard'
import type { Collections, SerializableCollection, SerializableFieldOptions } from '#pruvious/server'
import type { PUICell, PUIColumns } from '@pruvious/ui/pui/table'
import { castToNumber, isObject, isString, isUndefined } from '@pruvious/utils'
import { computedAsync } from '@vueuse/core'
import { dirname } from 'pathe'

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
    type: [Number, null],
  },

  /**
   * The field name defined in a collection.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'image'>>,
    required: true,
  },

  /**
   * The name and definition of the current translatable collection.
   */
  collection: {
    type: Object as PropType<{ name: keyof Collections; definition: SerializableCollection }>,
    required: true,
  },

  /**
   * Triggers a data refresh operation by executing the callback function with the current URL query parameters.
   *
   * The operation is skipped if the URL query parameters have not changed since the last refresh.
   * The `force` parameter can be used to force a refresh operation even if the URL query parameters have not changed.
   * By default, the operation is not forced.
   *
   * Returns a `Promise` that resolves when the refresh operation is complete.
   */
  refresh: {
    type: Function as PropType<(force?: boolean) => Promise<void>>,
  },

  /**
   * Specifies whether the field is editable.
   *
   * @default false
   */
  editable: {
    type: Boolean,
    default: false,
  },
})

const route = useRoute()
const dashboard = usePruviousDashboard()
const uploadsCollection = { name: 'Uploads' as const, definition: dashboard.value!.collections.Uploads! }
const isDetailsPopupVisible = ref(false)
const isEditPopupVisible = ref(false)
const canRead = hasPermission('collection:uploads:read')
const showThumbnail = computed(
  () =>
    isUndefined(props.options.ui.dataTable) ||
    props.options.ui.dataTable === true ||
    (isObject(props.options.ui.dataTable) && props.options.ui.dataTable.showThumbnail),
)
const loadingFile = ref(false)
const file = ref<UploadItem | null>(await fetchFileData())
const dir = computed(() => dirname(file.value?.path ?? ''))
const { resolver: permissionsResolver } = useCollectionRecordPermissions(uploadsCollection)
const resolvedPermissions = computedAsync(() =>
  file.value
    ? permissionsResolver(file.value.id, {
        author: uploadsCollection.definition.authorField ? file.value!.author : undefined,
        editors: uploadsCollection.definition.editorsField ? file.value!.editors : undefined,
      })
    : undefined,
)

watch(
  () => props.modelValue,
  async () => {
    file.value = await fetchFileData()
  },
  { immediate: true },
)

watch(
  () => route.query,
  () => {
    if (isString(route.query.edit)) {
      const [fieldName, id] = route.query.edit.split(':')
      if (fieldName === props.name && castToNumber(id) === props.cell.row.id) {
        isEditPopupVisible.value = true
      }
    }
  },
  { immediate: true },
)

async function fetchFileData(): Promise<UploadItem | null> {
  if (canRead && props.modelValue) {
    loadingFile.value = true

    return selectFrom('Uploads')
      .where('id', '=', props.modelValue)
      .cache(3000)
      .first()
      .then((res) => (res.success ? res.data : null))
      .finally(() => {
        loadingFile.value = false
      })
  }

  return null
}
</script>

<style scoped>
a.p-item {
  --pui-muted-foreground: currentColor;
  color: hsl(var(--pui-muted-foreground));
  text-decoration: none;
}

a.p-item:hover,
a.p-item:focus {
  color: hsl(var(--pui-foreground));
}

.p-image-preview {
  position: relative;
  width: 6.5rem;
  aspect-ratio: 1;
}
</style>
