<template>
  <!-- @todo use sticky popup here (header and footer sticky, inner content scrollable) -->
  <PUIPopup @close="close()" @keydown="$emit('keydown', $event)" ref="popup">
    <template #header>
      <div class="pui-row">
        <span class="p-title">{{ __('pruvious-dashboard', 'View configuration') }}</span>
        <PUIButton
          :size="-2"
          :title="__('pruvious-dashboard', 'Close')"
          @click="close()"
          variant="ghost"
          class="pui-ml-auto"
        >
          <Icon mode="svg" name="tabler:x" />
        </PUIButton>
      </div>
    </template>

    <PUITabs
      :active="activeTab"
      :list="[
        { name: 'general', label: __('pruvious-dashboard', 'General') },
        { name: 'columns', label: __('pruvious-dashboard', 'Columns') },
        { name: 'filters', label: __('pruvious-dashboard', 'Filters') },
      ]"
      @change="activeTab = $event"
    >
      <PUITab name="general">
        <div>general (@todo stored configurations here; read from users.tableSettings)</div>
      </PUITab>

      <PUITab name="columns">
        <div>@todo columns</div>
      </PUITab>

      <PUITab name="filters">
        <PruviousDashboardWhereFilters
          v-model="data.where"
          :collection="collection"
          :fieldChoices="fieldChoices"
          @commit="
            (value) => {
              data = { ...data, where: value, activeTab }
              if (history.size) {
                history.push(data)
              }
            }
          "
          ref="whereFiltersComponent"
        />
      </PUITab>
    </PUITabs>

    <template #footer>
      <div class="pui-justify-between">
        <PruviousDashboardHistoryButtons
          v-model="data"
          :history="history"
          @update:modelValue="
            () => {
              $nextTick(whereFiltersComponent?.refresh)
              activeTab = data.activeTab
            }
          "
        />

        <div class="pui-row">
          <PUIButton :variant="history.isDirty.value ? 'primary' : 'outline'" @click="apply()">
            {{ __('pruvious-dashboard', 'Apply') }}
          </PUIButton>
        </div>
      </div>
    </template>
  </PUIPopup>
</template>

<script lang="ts" setup>
import { __, History, resolveFieldLabel, unsavedChanges } from '#pruvious/client'
import type { Collections, SerializableCollection } from '#pruvious/server'
import type { WhereField as _WhereField, SelectQueryBuilderParams } from '@pruvious/orm'
import { blurActiveElement, deepClone, sortNaturallyByProp } from '@pruvious/utils'

export interface WhereOrGroupSimplified {
  or: (_WhereField | WhereOrGroupSimplified)[][]
}

interface TableSettings {
  where: (_WhereField | WhereOrGroupSimplified)[]
  activeTab: 'general' | 'columns' | 'filters'
}

const props = defineProps({
  /**
   * The current `SelectQueryBuilderParams`.
   */
  params: {
    type: Object as PropType<SelectQueryBuilderParams>,
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

const emit = defineEmits<{
  'update:params': [params: SelectQueryBuilderParams]
  'close': [close: () => Promise<void>]
  'keydown': [event: KeyboardEvent]
}>()

const popup = useTemplateRef('popup')
const activeTab = ref<'general' | 'columns' | 'filters'>('general')
const data = ref<TableSettings>(deepClone({ where: props.params.where ?? [], activeTab: activeTab.value }))
const fieldChoices = computed(() =>
  sortNaturallyByProp(
    Object.entries(props.collection.definition.fields).map(([fieldName, definition]) => ({
      value: fieldName,
      label: resolveFieldLabel(definition.ui?.label, fieldName),
    })),
    'label',
  ),
)
const history = new History({ omit: ['activeTab'] })
const whereFiltersComponent = useTemplateRef('whereFiltersComponent')
const { listen, isListening } = usePUIHotkeys({ allowInOverlays: true, target: () => popup.value?.root, listen: false })

onMounted(() => {
  setTimeout(() => {
    history.push(data.value)
    isListening.value = true
    listen('save', (e) => {
      e.preventDefault()
      blurActiveElement()
      setTimeout(apply)
    })
  })
})

function apply() {
  emit('update:params', { ...props.params, where: data.value.where })
  history.clear()
  emit('close', popup.value!.close)
}

async function close() {
  if (!history.isDirty.value || (await unsavedChanges.prompt?.())) {
    emit('close', popup.value!.close)
  }
}
</script>

<style scoped>
.p-title {
  font-weight: 500;
}

:deep(.pui-tabs-content:not(:first-child)) {
  margin-top: 0.75rem;
}
</style>
