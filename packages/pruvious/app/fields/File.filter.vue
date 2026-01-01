<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <div v-if="canRead" class="pui-row">
      <template v-if="modelValue.value">
        <PUIButton
          v-if="file"
          v-pui-tooltip="file.path"
          :href="`${dashboardBasePath}media${dir === '/' ? '' : dir}?details=${file.id}`"
          @click="
            (event: MouseEvent) => {
              if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
                event.preventDefault()
                isDetailsPopupVisible = true
              }
            }
          "
          is="a"
          variant="outline"
          class="pui-shrink"
        >
          <span :title="filename" class="pui-flex">
            <span class="pui-truncate">
              <span>{{ filenameWithoutExtension }}</span>
              <span v-if="extensionWithoutDot" class="pui-muted">.</span>
            </span>
            <span v-if="extensionWithoutDot" class="pui-shrink-0 pui-muted">{{ extensionWithoutDot }}</span>
          </span>
        </PUIButton>

        <PUIButton v-else-if="!loadingFile" disabled variant="outline" class="pui-shrink">
          <span class="pui-truncate">{{ __('pruvious-dashboard', 'File not found') + ` (#${modelValue.value})` }}</span>
        </PUIButton>

        <PUIButton
          v-pui-tooltip="__('pruvious-dashboard', 'Replace')"
          @click="isMediaLibraryPopupVisible = true"
          variant="outline"
        >
          <Icon mode="svg" name="tabler:replace" />
        </PUIButton>

        <PUIButton
          v-pui-tooltip="__('pruvious-dashboard', 'Clear selection')"
          @click="
            () => {
              isMediaLibraryPopupVisible = false
              $emit('update:modelValue', { ...modelValue, value: null })
              $emit('commit', { ...modelValue, value: null })
            }
          "
          variant="outline"
        >
          <Icon mode="svg" name="tabler:x" />
        </PUIButton>
      </template>

      <PUIButton v-else @click="isMediaLibraryPopupVisible = true" variant="outline" class="pui-shrink">
        <span class="pui-truncate">{{ selectLabel }}</span>
      </PUIButton>
    </div>

    <PUINumber
      v-else
      :id="id"
      :min="1"
      :modelValue="Number(modelValue.value)"
      :name="id"
      @commit="$emit('commit', { ...modelValue, value: $event })"
      @update:modelValue="$emit('update:modelValue', { ...modelValue, value: $event })"
      showSteppers
    />

    <PruviousDashboardMediaLibraryPopup
      v-model:isVisible="isMediaLibraryPopupVisible"
      :initialFilePath="file?.path"
      :label="label"
      :modelValue="(modelValue as any).value"
      :selectLabel="selectLabel"
      @update:isVisible="!$event && (isMediaLibraryPopupVisible = false)"
      @update:modelValue="
        (value) => {
          $emit('commit', { ...modelValue, value })
          $emit('update:modelValue', { ...modelValue, value })
        }
      "
      selectionMode="single"
    />

    <PruviousDashboardMediaItemDetailsPopup
      v-if="isDetailsPopupVisible && file"
      :resolvedPermissions="resolvedPermissions"
      :upload="file"
      @close="$event().then(() => (isDetailsPopupVisible = false))"
      @deselect="
        () => {
          $emit('update:modelValue', { ...modelValue, value: null })
          $emit('commit', { ...modelValue, value: null })
        }
      "
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import {
  __,
  dashboardBasePath,
  hasPermission,
  maybeTranslate,
  resolveFieldLabel,
  selectFrom,
  useCollectionRecordPermissions,
  usePruviousDashboard,
  type WhereField,
} from '#pruvious/client'
import type { SerializableFieldOptions } from '#pruvious/server'
import { isDefined } from '@pruvious/utils'
import { computedAsync } from '@vueuse/core'
import { basename, dirname, extname } from 'pathe'

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
    type: Object as PropType<SerializableFieldOptions<'file'>>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const id = useId()
const label = resolveFieldLabel(props.options.ui.label, props.name)
const selectLabel = isDefined(props.options.ui.selectLabel)
  ? maybeTranslate(props.options.ui.selectLabel)
  : __('pruvious-dashboard', 'Select file')
const dashboard = usePruviousDashboard()
const uploadCollection = { name: 'Uploads' as const, definition: dashboard.value!.collections.Uploads! }
const isMediaLibraryPopupVisible = ref(false)
const isDetailsPopupVisible = ref(false)
const canRead = hasPermission('collection:uploads:read')
const loadingFile = ref(false)
const file = computedAsync(async () => {
  if (props.modelValue.value) {
    loadingFile.value = true
    return selectFrom('Uploads')
      .where('id', '=', props.modelValue.value as number)
      .cache(3000)
      .first()
      .then((res) => (res.success ? res.data : null))
      .finally(() => {
        loadingFile.value = false
      })
  }
  return null
}, null)
const filename = computed(() => basename(file.value?.path ?? ''))
const extension = computed(() => extname(filename.value))
const filenameWithoutExtension = computed(() =>
  extension.value ? filename.value.slice(0, -extension.value.length) : filename.value,
)
const extensionWithoutDot = computed(() =>
  extension.value.startsWith('.') ? extension.value.slice(1) : extension.value,
)
const dir = computed(() => dirname(file.value?.path ?? ''))
const { resolver: permissionsResolver } = useCollectionRecordPermissions(uploadCollection)
const resolvedPermissions = computedAsync(() =>
  canRead && file.value
    ? permissionsResolver(file.value.id, {
        author: uploadCollection.definition.authorField ? file.value!.author : undefined,
        editors: uploadCollection.definition.editorsField ? file.value!.editors : undefined,
      })
    : undefined,
)
</script>
