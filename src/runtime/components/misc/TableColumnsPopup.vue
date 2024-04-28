<template>
  <PruviousPopup :visible="visible" @hotkey="onHotkey" @update:visible="emit('update:visible', $event)" width="24rem">
    <template #header>
      <h2 class="truncate text-sm">{{ __('pruvious-dashboard', 'Edit columns') }}</h2>
    </template>

    <form @submit.prevent="apply()">
      <div class="flex flex-col gap-4 p-4">
        <component
          v-model="columns"
          :errors="errors"
          :is="CheckboxesField"
          :options="{ choices: columnChoices, sortable: true }"
          @updateChoices="columnChoices = $event"
          fieldKey="columns"
        />
      </div>

      <div class="flex justify-between gap-2 border-t p-4">
        <button v-show="!isDefault" @click="restoreDefaults()" type="button" class="button button-white">
          <span>{{ __('pruvious-dashboard', 'Restore defaults') }}</span>
        </button>

        <button @click="emit('update:visible', false)" type="button" class="button button-white ml-auto">
          <span>{{ __('pruvious-dashboard', 'Cancel') }}</span>
        </button>

        <button @click="apply()" type="submit" class="button">
          <span>{{ __('pruvious-dashboard', 'Apply') }}</span>
        </button>
      </div>
    </form>
  </PruviousPopup>
</template>

<script lang="ts" setup>
import { computed, ref, watch, type PropType } from '#imports'
import { checkboxesFieldComponent, dashboardMiscComponent } from '#pruvious/dashboard'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import type { HotkeyAction } from '../../composables/dashboard/hotkeys'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import type { CollectionOverview } from '../../utils/dashboard/collection-overview'

const props = defineProps({
  table: {
    type: Object as PropType<CollectionOverview<any>>,
    required: true,
  },
  visible: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits<{
  'update:visible': [boolean]
}>()

const dashboard = usePruviousDashboard()

const CheckboxesField = checkboxesFieldComponent()

const collection = dashboard.value.collections[dashboard.value.collection!]
const columnChoices = ref<Record<string, string>>(createColumnChoices())
const columns = ref<string[]>([])
const defaultColumns = collection.dashboard.overviewTable.columns.map(({ field }) => field)
const errors = ref<Record<string, string>>({})
const isDefault = computed(() => JSON.stringify(columns.value) === JSON.stringify(defaultColumns))

const PruviousPopup = dashboardMiscComponent.Popup()

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      columns.value = [...props.table.filter.selectOption.value]
    }
  },
)

watch(columns, () => {
  errors.value = {}
})

async function apply() {
  if (columns.value.length) {
    emit('update:visible', false)

    if (JSON.stringify(columns.value) !== JSON.stringify(props.table.filter.selectOption.value)) {
      props.table.filter.select(columns.value)
      await props.table.updateLocation()
    }
  } else {
    errors.value.columns = __('pruvious-dashboard', 'At least one column must be selected')
  }
}

function createColumnChoices() {
  return Object.fromEntries(
    Object.entries(collection.fields)
      .filter(([_, { additional }]) => !additional.hidden)
      .map(([fieldName, { options }]) => [fieldName, __('pruvious-dashboard', options.label as any)]),
  )
}

function restoreDefaults() {
  columnChoices.value = createColumnChoices()
  columns.value = [...defaultColumns]
}

function onHotkey(action: HotkeyAction) {
  if (action === 'close') {
    emit('update:visible', false)
  } else if (action === 'save') {
    apply()
  }
}
</script>
