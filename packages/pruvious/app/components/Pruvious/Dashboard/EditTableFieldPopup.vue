<template>
  <PUIPopup :fullHeight="fullHeight" :size="-1" @close="close()" ref="popup" width="40rem">
    <template #header>
      <span class="p-title pui-row">
        <span class="pui-truncate">{{ label }}</span>
        <span class="pui-shrink-0 pui-muted">(#{{ cell.row.id }})</span>
        <PUIButton
          :size="-2"
          :title="__('pruvious-dashboard', 'Close')"
          @click="close()"
          variant="ghost"
          class="pui-ml-auto"
        >
          <Icon mode="svg" name="tabler:x" />
        </PUIButton>
      </span>
    </template>

    <PruviousFields
      v-if="data"
      v-model:conditionalLogic="conditionalLogic"
      v-model:modelValue="data"
      :alwaysVisibleFields="[props.name]"
      :conditionalLogicResolver="conditionalLogicResolver"
      :data="data"
      :dataContainerName="collection.name"
      :disabled="disabled"
      :errors="errors"
      :fields="fieldDefinitions"
      :layout="layout"
      :syncedFields="collection.definition.syncedFields"
      :translatable="collection.definition.translatable"
      @commit="history.push($event)"
      @queueConditionalLogicUpdate="queueConditionalLogicUpdate($event)"
      @update:modelValue="(_, path) => queueConditionalLogicUpdate(path)"
      dataContainerType="collection"
      operation="update"
    />

    <PruviousDashboardHistoryScrollState />

    <template v-if="!disabled" #footer>
      <div class="pui-justify-between">
        <PruviousDashboardHistoryButtons
          v-if="isListening"
          v-model="data"
          :history="history"
          @update:modelValue="
            () => {
              errors = {}
              queueConditionalLogicUpdate('$reset')
            }
          "
        />
        <PUIButton :variant="history.isDirty.value ? 'primary' : 'outline'" @click="saveData()" class="pui-ml-auto">
          {{ __('pruvious-dashboard', 'Save') }}
        </PUIButton>
      </div>
    </template>
  </PUIPopup>
</template>

<script lang="ts" setup>
import {
  __,
  getTopLevelFieldDependencies,
  History,
  maybeTranslate,
  parseConditionalLogic,
  prepareFieldData,
  pruviousDashboardPost,
  QueryBuilder,
  resolveFieldLabel,
  unsavedChanges,
} from '#pruvious/client'
import type {
  Collections,
  FieldsLayout,
  GenericSerializableFieldOptions,
  SerializableCollection,
} from '#pruvious/server'
import { ConditionalLogicResolver } from '@pruvious/orm/conditional-logic-resolver'
import { usePUIHotkeys } from '@pruvious/ui/pui/hotkeys'
import type { PUICell, PUIColumns } from '@pruvious/ui/pui/table'
import { puiQueueToast } from '@pruvious/ui/pui/toast'
import {
  blurActiveElement,
  isDefined,
  isEmpty,
  isString,
  isUndefined,
  lockAndLoad,
  pick,
  remap,
  titleCase,
  toArray,
} from '@pruvious/utils'
import { useDebounceFn } from '@vueuse/core'

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
    type: null as unknown as PropType<any>,
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
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<GenericSerializableFieldOptions>,
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
   * Disables all form fields when set to `true`.
   * When disabled, fields cannot be interacted with and appear visually dimmed.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    required: true,
  },

  /**
   * Controls whether the edit popup expands to full height with sticky header and footer.
   * You can also set it to `auto` to make the popup auto-height while preserving the sticky header and footer.
   *
   * @default false
   */
  fullHeight: {
    type: [Boolean, String] as PropType<boolean | 'auto'>,
    default: false,
  },

  /**
   * A function called when the popup is initialized.
   */
  onInit: {
    type: Function as PropType<() => void>,
  },
})

const emit = defineEmits<{
  close: [close: () => Promise<void>]
  updated: []
}>()

defineExpose({ close })

const data = ref({ [props.name]: props.modelValue })
const dependencies = getTopLevelFieldDependencies(props.name, props.options).filter((dep) => dep !== props.name)
const queryBuilder = new QueryBuilder({ fetcher: pruviousDashboardPost })

if (dependencies.length) {
  if (dependencies.some((dep) => isUndefined(props.cell.row[dep]))) {
    await queryBuilder
      .selectFrom(props.collection.name)
      .select(dependencies as any)
      .where('id', '=', props.cell.row.id)
      .first()
      .then((result) => {
        if (result.success) {
          data.value = { ...data.value, ...result.data }
        }
      })
  } else {
    data.value = { ...data.value, ...pick(props.cell.row, dependencies) }
  }
}

const route = useRoute()
const popup = useTemplateRef('popup')
const fields = props.collection.definition.fields
const fieldDefinitions = remap(data.value, (fieldName) => [
  fieldName,
  { ...fields[fieldName]!, ui: { ...fields[fieldName]!.ui, hidden: false } },
])
const conditionalLogicResolver = new ConditionalLogicResolver()
let conditionalLogicDependencies: Record<string, boolean> = {}
const conditionalLogic = ref(resolveConditionalLogic())
const conditionalLogicUpdateQueue = new Set<(string & {}) | '$resolve' | '$reset'>()
const errors = ref<Record<string, string>>({})
const history = new History().push(data.value)
const isSubmitting = ref(false)
const { listen, isListening } = usePUIHotkeys({
  allowInOverlays: true,
  target: () => popup.value?.root,
  listen: false,
})
const label = isDefined(props.collection.definition.ui.label)
  ? maybeTranslate(props.collection.definition.ui.label)
  : __('pruvious-dashboard', titleCase(props.collection.name ?? '', false) as any)
const layout: FieldsLayout =
  Object.keys(fieldDefinitions).length > 1
    ? [
        {
          tabs: [
            {
              label: resolveFieldLabel(fieldDefinitions[props.name]!.ui?.label, props.name),
              fields: [props.name],
            },
            {
              label: __('pruvious-dashboard', 'Dependencies'),
              fields: dependencies,
            },
          ],
        },
      ]
    : [props.name]

let transitionDuration = 300

props.onInit?.()

watch(
  () => route.query,
  () => {
    setTimeout(() => {
      if (!route.query.edit) {
        history.clear()
        emit('close', popup.value!.close)
      }
    })
  },
)

onMounted(() => {
  if (!props.disabled) {
    setTimeout(() =>
      setTimeout(() =>
        setTimeout(() => {
          const potd = getComputedStyle(document.body).getPropertyValue('--pui-overlay-transition-duration')
          transitionDuration = potd.endsWith('ms') ? parseInt(potd) : potd.endsWith('s') ? parseFloat(potd) * 1000 : 300
          setTimeout(
            () =>
              popup.value?.root
                ?.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, [tabindex="0"]')
                ?.focus(),
            transitionDuration,
          )
        }),
      ),
    )
    setTimeout(() => {
      isListening.value = true
      listen('save', (e) => {
        e.preventDefault()
        blurActiveElement()
        setTimeout(saveData)
      })
    })
  }
})

onUnmounted(() => {
  navigateTo({ query: { ...route.query, edit: undefined } })
})

function resolveConditionalLogic(reset = true) {
  conditionalLogicResolver.setInput(data.value)
  conditionalLogicDependencies = {}
  if (reset) {
    conditionalLogicResolver.setConditionalLogic(parseConditionalLogic(fieldDefinitions, data.value))
  }
  return conditionalLogicResolver.resolve()
}

function queueConditionalLogicUpdate(path?: (string & {}) | string[] | '$resolve' | '$reset') {
  if (isUndefined(path) || path === '$resolve') {
    conditionalLogicUpdateQueue.add('$resolve')
  } else if (path === '$reset') {
    conditionalLogicUpdateQueue.add('$reset')
  } else {
    toArray(path).forEach((p) => conditionalLogicUpdateQueue.add(p))
  }
  updateConditionalLogicDebounced()
}

const updateConditionalLogicDebounced = useDebounceFn(() => {
  const queue = [...conditionalLogicUpdateQueue]
  conditionalLogicUpdateQueue.clear()
  if (queue.some((path) => path === '$reset')) {
    conditionalLogic.value = resolveConditionalLogic(true)
  } else {
    if (queue.some((path) => isString(path) && !isDefined(conditionalLogicDependencies[path]))) {
      const parsedConditionalLogic = parseConditionalLogic(fieldDefinitions, data.value)
      for (const from of Object.keys(parsedConditionalLogic)) {
        conditionalLogicDependencies[from] ??= false
        const referencedFieldPaths = conditionalLogicResolver.getReferencedFieldPaths(from)
        for (const to of referencedFieldPaths) {
          conditionalLogicDependencies[to] = true
        }
      }
    }
    if (queue.some((path) => path === '$resolve' || conditionalLogicDependencies[path])) {
      conditionalLogic.value = conditionalLogicResolver.setInput(data.value).resolve()
    }
  }
}, 50)

const saveData = lockAndLoad(isSubmitting, async () => {
  const preparedData = prepareFieldData(data.value, fieldDefinitions, history.getOriginalState())
  const query = await queryBuilder
    .update(props.collection.name)
    .set(preparedData)
    .where('id', '=', props.cell.row.id)
    .returning(Object.keys(fieldDefinitions) as any)
    .run()

  if (query.success) {
    if (!isEmpty(query.data)) {
      data.value = query.data[0]!
      errors.value = {}
      history.push(data.value).setOriginalState(data.value)
      puiQueueToast(__('pruvious-dashboard', 'Saved'), { type: 'success' })
      emit('updated')
    } else {
      puiQueueToast(__('pruvious-dashboard', 'Record not found'), { type: 'error' })
    }

    emit('close', popup.value!.close)
  } else if (query.inputErrors) {
    errors.value = query.inputErrors
    puiQueueToast(__('pruvious-dashboard', 'Found $count $errors', { count: Object.keys(errors.value).length }), {
      type: 'error',
    })
  }
})

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
</style>
