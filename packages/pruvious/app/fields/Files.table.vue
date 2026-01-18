<template>
  <div>
    <PruviousDashboardEditableFieldCell :cell="cell" :editable="editable" :name="name" editButtonPosition="auto" wrap>
      <template v-if="choices?.length">
        <PUIButton
          v-for="{ label, value, detail, tooltip } of choices"
          v-pui-tooltip="tooltip"
          :href="`${dashboardBasePath}media${detail === '/' ? '' : detail}?details=${value}`"
          :size="-2"
          :title="label ? `${label} (#${value})` : String(value)"
          @click="
            (event: MouseEvent) => {
              if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
                event.preventDefault()
                focusedFile = files[value as number] as UploadItem
                isDetailsPopupVisible = true
              }
            }
          "
          is="a"
          target="_blank"
          variant="secondary"
          class="p-item"
        >
          <PruviousDashboardMediaFileName v-if="tooltip" :path="label!" />
          <span v-else>{{ value }}</span>
        </PUIButton>
      </template>
      <span v-else>-</span>
    </PruviousDashboardEditableFieldCell>

    <PruviousDashboardMediaItemDetailsPopup
      v-if="isDetailsPopupVisible && focusedFile"
      :resolvedPermissions="resolvedPermissions[focusedFile.id]"
      :upload="focusedFile"
      @close="$event().then(() => (isDetailsPopupVisible = false))"
      @data="
        async (data) => {
          files[focusedFile!.id] = data
          focusedFile = data
          choices = await selectedChoicesResolver()
        }
      "
      @deselect="
        async (upload) => {
          await refresh?.(true)
          delete files[upload.id]
          choices = await selectedChoicesResolver()
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
import { __, hasPermission } from '#pruvious/app'
import {
  batchSelectIn,
  dashboardBasePath,
  selectFrom,
  useCollectionRecordPermissions,
  usePruviousDashboard,
  type ResolvedCollectionRecordPermissions,
  type UploadItem,
} from '#pruvious/dashboard'
import type { Collections, SerializableCollection, SerializableFieldOptions } from '#pruvious/server'
import type { PUIDynamicChipsChoiceModel } from '@pruvious/ui/components/PUIDynamicChips.vue'
import type { PUICell, PUIColumns } from '@pruvious/ui/pui/table'
import { castToNumber, isObject, isString, sleep } from '@pruvious/utils'
import { basename, dirname } from 'pathe'

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
    type: Array as PropType<number[]>,
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
    type: Object as PropType<SerializableFieldOptions<'files'>>,
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
const files = ref<Record<number, UploadItem | 'loading' | 'error'>>({})
const choices = ref<PUIDynamicChipsChoiceModel[]>([])
const focusedFile = ref<UploadItem | null>(null)
const { resolver: permissionsResolver } = useCollectionRecordPermissions(uploadsCollection)
const resolvedPermissions = ref<Record<number, ResolvedCollectionRecordPermissions>>({})

watch(
  () => props.modelValue,
  async () => {
    choices.value = await selectedChoicesResolver()
  },
  { immediate: true },
)

watch(
  files,
  async () => {
    for (const file of Object.values(files.value)) {
      if (isObject(file) && !resolvedPermissions.value[file.id]) {
        resolvedPermissions.value[file.id] = await permissionsResolver(file.id, {
          author: uploadsCollection.definition.authorField ? file.author : undefined,
          editors: uploadsCollection.definition.editorsField ? file.editors : undefined,
        })
      }
    }
  },
  { deep: true },
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

async function fetchFilesData() {
  if (canRead && props.modelValue) {
    const ids = [...props.modelValue]

    if (ids.length) {
      if (ids.some((id) => files.value[id] === 'loading')) {
        await sleep(50)
        return fetchFilesData()
      }

      const missingIds = ids.filter((id) => !files.value[id])

      for (const id of missingIds) {
        files.value[id] = 'loading'
      }

      const records = missingIds.length
        ? await batchSelectIn(missingIds, (batch) =>
            selectFrom('Uploads')
              .where('id', 'in', batch)
              .cache(3000)
              .all()
              .then(({ data }) => data ?? []),
          )
        : []

      for (const id of missingIds) {
        files.value[id] = records.find((r) => r.id === id) ?? 'error'
      }
    }
  }
}

async function selectedChoicesResolver(): Promise<PUIDynamicChipsChoiceModel[]> {
  const ids = props.modelValue ? [...props.modelValue] : []

  if (ids.length) {
    await fetchFilesData()

    return ids.map((id) => {
      if (isObject(files.value[id])) {
        return {
          value: id,
          label: basename(files.value[id].path),
          detail: dirname(files.value[id].path),
          tooltip: files.value[id].path,
        }
      }

      return {
        value: id,
        label: __('pruvious-dashboard', 'File not found') + ` (#${id})`,
        detail: '',
      }
    })
  }

  return []
}
</script>

<style scoped>
.p-item {
  height: 1.5rem;
  font-size: 0.75rem;
}

.p-item :deep(.pui-button-inner) {
  display: block;
  padding: 0 0.5rem;
}

.p-item :deep(.pui-muted) {
  color: currentColor;
  opacity: 0.64;
}
</style>
