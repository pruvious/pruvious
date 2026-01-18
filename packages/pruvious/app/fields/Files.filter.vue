<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :operatorChoices="[
      { value: 'includes', label: __('pruvious-dashboard', 'Includes all') },
      { value: 'includesAny', label: __('pruvious-dashboard', 'Includes any') },
      { value: 'excludes', label: __('pruvious-dashboard', 'Excludes all') },
      { value: 'excludesAny', label: __('pruvious-dashboard', 'Excludes any') },
      { value: 'lt', label: __('pruvious-dashboard', 'Has less than') },
      { value: 'gt', label: __('pruvious-dashboard', 'Has more than') },
      { value: 'gte', label: __('pruvious-dashboard', 'Has at least') },
      { value: 'lte', label: __('pruvious-dashboard', 'Has at most') },
    ]"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <div
      v-if="
        modelValue.operator === 'lt' ||
        modelValue.operator === 'lte' ||
        modelValue.operator === 'gt' ||
        modelValue.operator === 'gte'
      "
    >
      <PUINumber
        :id="id"
        :min="0"
        :modelValue="typeof modelValue.value === 'number' ? modelValue.value : 0"
        :name="id"
        :suffix="__('pruvious-dashboard', '$entries', { count: Number(modelValue.value) })"
        @commit="$emit('commit', { ...modelValue, value: $event })"
        @update:modelValue="$emit('update:modelValue', { ...modelValue, value: $event })"
        showSteppers
      />
    </div>

    <div v-else-if="canRead" class="pui-row">
      <PUIButton
        v-pui-tooltip="__('pruvious-dashboard', 'Media library')"
        @click="isMediaLibraryPopupVisible = true"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:library-photo" />
      </PUIButton>

      <PUIDynamicChips
        :choicesResolver="choicesResolver"
        :enforceUniqueItems="options.enforceUniqueItems"
        :id="id"
        :maxItems="options.maxItems"
        :minItems="options.minItems"
        :modelValue="typeof (modelValue as any).value === 'object' ? (modelValue as any).value : []"
        :name="id"
        :noResultsFoundLabel="__('pruvious-dashboard', 'No results found')"
        :placeholder="placeholder"
        :removeItemLabel="__('pruvious-dashboard', 'Remove')"
        :selectedChoicesResolver="selectedChoicesResolver"
        :variant="options.ui.variant"
        @dblclick="(id, event) => onDoubleClick(+id!, event)"
        @update:modelValue="
          (value: any) => {
            $emit('update:modelValue', { ...modelValue, value })
            $emit('commit', { ...modelValue, value })
          }
        "
        class="p-files-chips"
      >
        <template #label="{ choice }">
          <PruviousDashboardMediaFileName
            v-pui-tooltip="choice.tooltip"
            :path="(choice.label ?? (choice.value as string)) || '-'"
            :title="choice.label ?? String(choice.value)"
            class="pui-dynamic-chips-label"
          />
        </template>
      </PUIDynamicChips>
    </div>

    <div v-else>
      <p>{{ __('pruvious-dashboard', 'You do not have permission to access the media library.') }}</p>
    </div>

    <PruviousDashboardMediaLibraryPopup
      v-model:isVisible="isMediaLibraryPopupVisible"
      :initialFilePath="initialFilePath"
      :label="label"
      :modelValue="typeof (modelValue as any).value === 'object' ? (modelValue as any).value : []"
      @update:isVisible="!$event && (isMediaLibraryPopupVisible = false)"
      @update:modelValue="
        (value) => {
          $emit('commit', { ...modelValue, value })
          $emit('update:modelValue', { ...modelValue, value })
        }
      "
      selectionMode="multiple"
    />

    <PruviousDashboardMediaItemDetailsPopup
      v-if="isDetailsPopupVisible && focusedFile"
      :resolvedPermissions="resolvedPermissions[focusedFile.id]"
      :upload="focusedFile"
      @close="$event().then(() => (isDetailsPopupVisible = false))"
      @data="
        (data) => {
          files[focusedFile!.id] = data
          focusedFile = data
        }
      "
      @deselect="
        () => {
          if (isArray<number>(modelValue.value)) {
            const newValue = modelValue.value.filter((id) => id !== focusedFile!.id)
            $emit('update:modelValue', { ...modelValue, value: newValue })
            $emit('commit', { ...modelValue, value: newValue })
          }
        }
      "
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { __, hasPermission } from '#pruvious/app'
import {
  batchSelectIn,
  dashboardBasePath,
  maybeTranslate,
  resolveFieldLabel,
  selectFrom,
  useCollectionRecordPermissions,
  usePruviousDashboard,
  type ResolvedCollectionRecordPermissions,
  type UploadItem,
  type WhereField,
} from '#pruvious/dashboard'
import type { SerializableFieldOptions } from '#pruvious/server'
import type {
  PUIDynamicChipsChoiceModel,
  PUIDynamicChipsPaginatedChoices,
} from '@pruvious/ui/components/PUIDynamicChips.vue'
import { isArray, isObject, sleep } from '@pruvious/utils'
import { basename, dirname } from 'pathe'

const props = defineProps({
  /**
   * The current where condition.
   */
  modelValue: {
    type: Object as PropType<WhereField>,
    required: true,
  },

  /**
   * The field name defined in a collection.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'records'>>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
const label = resolveFieldLabel(props.options.ui.label, props.name)
const placeholder = maybeTranslate(props.options.ui.placeholder)
const dashboard = usePruviousDashboard()
const uploadsCollection = { name: 'Uploads' as const, definition: dashboard.value!.collections.Uploads! }
const isMediaLibraryPopupVisible = ref(false)
const isDetailsPopupVisible = ref(false)
const canRead = hasPermission('collection:uploads:read')
const files = ref<Record<number, UploadItem | 'loading' | 'error'>>({})
const focusedFile = ref<UploadItem | null>(null)
const initialFilePath = computed(() => Object.values(files.value).find((file) => isObject(file))?.path)
const { resolver: permissionsResolver } = useCollectionRecordPermissions(uploadsCollection)
const resolvedPermissions = ref<Record<number, ResolvedCollectionRecordPermissions>>({})

watch(
  () => props.modelValue.value,
  async () => {
    await fetchFilesData()
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

async function fetchFilesData() {
  if (canRead && props.modelValue.value) {
    const ids = isArray<number>(props.modelValue.value) ? [...props.modelValue.value] : []

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

async function choicesResolver(page: number, keyword: string): Promise<PUIDynamicChipsPaginatedChoices> {
  const results = await selectFrom('Uploads')
    .search(keyword, 'path')
    .where('type', '=', 'file')
    .where('isLocked', '=', false)
    .orderBy(uploadsCollection.definition.createdAtField ? 'createdAt' : 'id', 'desc')
    .cache(3000)
    .paged(page, 50)
    .paginate()

  if (results.success) {
    const choices = results.data.records.map((record) => ({
      value: record.id,
      label: basename(record.path),
      detail: record.path,
    }))

    for (const record of results.data.records) {
      files.value[record.id] = record
    }

    return {
      choices,
      currentPage: results.data.currentPage,
      lastPage: results.data.lastPage,
      perPage: results.data.perPage,
      total: results.data.total,
    }
  }

  return {
    choices: [],
    currentPage: 1,
    lastPage: 1,
    perPage: 50,
    total: 0,
  }
}

async function selectedChoicesResolver(): Promise<PUIDynamicChipsChoiceModel[]> {
  const ids = isArray<number>(props.modelValue.value) ? [...props.modelValue.value] : []

  if (ids.length) {
    await fetchFilesData()

    return ids.map((id) => {
      if (isObject(files.value[id])) {
        return {
          value: id,
          label: basename(files.value[id].path),
          tooltip: files.value[id].path,
        }
      }

      return {
        value: id,
        label: __('pruvious-dashboard', 'File not found') + ` (#${id})`,
      }
    })
  }

  return []
}

function onDoubleClick(id: number, event: MouseEvent) {
  if (isObject(files.value[id])) {
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
      focusedFile.value = files.value[id]
      isDetailsPopupVisible.value = true
    } else {
      const dir = dirname(files.value[id].path)
      window.open(`${dashboardBasePath}media${dir === '/' ? '' : dir}?details=${id}`, '_blank')
    }
  }
}
</script>

<style scoped>
.pui-dynamic-chips-label :deep(.pui-muted) {
  color: currentColor;
  opacity: 0.64;
}

.p-files-chips.pui-dynamic-chips-dragging .pui-dynamic-chips-label {
  pointer-events: none;
}
</style>
