<template>
  <PUIPopup :size="-1" @close="$emit('close', $event)" ref="popup" width="26rem">
    <template #header>
      <div class="pui-row">
        <span class="pui-medium">{{ __('pruvious-dashboard', 'Link options') }}</span>
        <PUIButton
          :size="-2"
          :title="__('pruvious-dashboard', 'Close')"
          @click="$emit('close', popup!.close)"
          variant="ghost"
          class="pui-ml-auto"
        >
          <Icon mode="svg" name="tabler:x" />
        </PUIButton>
      </div>
    </template>

    <PUIField v-if="showTarget">
      <PUIFieldLabel>
        <label :for="targetId">{{ __('pruvious-dashboard', 'Target') }}</label>
      </PUIFieldLabel>
      <PUISelect
        :choices="targetChoices"
        :disabled="disabled"
        :id="targetId"
        :modelValue="draftTarget"
        @update:modelValue="draftTarget = ($event as string) ?? ''"
      />
      <PruviousFieldMessage :options="targetOptions" name="target" />
    </PUIField>

    <PUIField v-if="showRel">
      <PUIFieldLabel>
        <label :for="relId">{{ __('pruvious-dashboard', 'Relationship (rel)') }}</label>
      </PUIFieldLabel>
      <PUIInput
        :disabled="disabled"
        :id="relId"
        :modelValue="draftRel"
        :spellcheck="false"
        @update:modelValue="draftRel = $event"
        autocomplete="off"
        placeholder="noopener noreferrer"
      />
      <PruviousFieldMessage :options="relOptions" name="rel" />
    </PUIField>

    <PUIField v-if="showQuery">
      <PUIFieldLabel>
        <label :for="queryId">{{ __('pruvious-dashboard', 'Query string') }}</label>
      </PUIFieldLabel>
      <PUIInput
        :disabled="disabled"
        :id="queryId"
        :modelValue="draftQuery"
        :spellcheck="false"
        @update:modelValue="draftQuery = normalizeQuery($event)"
        autocomplete="off"
        placeholder="foo=bar&baz=qux"
      />
      <PruviousFieldMessage :options="queryOptions" name="query" />
    </PUIField>

    <PUIField v-if="showHash">
      <PUIFieldLabel>
        <label :for="hashId">{{ __('pruvious-dashboard', 'Hash') }}</label>
      </PUIFieldLabel>
      <PUIInput
        :disabled="disabled"
        :id="hashId"
        :modelValue="draftHash"
        :spellcheck="false"
        @update:modelValue="draftHash = normalizeHash($event)"
        autocomplete="off"
        placeholder="section"
      />
      <PruviousFieldMessage :options="hashOptions" name="hash" />
    </PUIField>

    <template #footer>
      <div class="pui-row pui-justify-between">
        <PUIButton @click="$emit('close', popup!.close)" variant="outline">
          {{ __('pruvious-dashboard', 'Cancel') }}
        </PUIButton>

        <PUIButton :disabled="disabled" :variant="isDirty ? 'primary' : 'outline'" @click="save()">
          {{ __('pruvious-dashboard', 'Apply') }}
        </PUIButton>
      </div>
    </template>
  </PUIPopup>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { usePUIHotkeys } from '@pruvious/ui/pui/hotkeys'

const props = defineProps({
  /**
   * The committed `target` attribute value.
   */
  target: {
    type: String,
    default: '',
  },

  /**
   * The committed `rel` attribute value.
   */
  rel: {
    type: String,
    default: '',
  },

  /**
   * The committed query string (without the leading `?`).
   */
  query: {
    type: String,
    default: '',
  },

  /**
   * The committed hash fragment (without the leading `#`).
   */
  hash: {
    type: String,
    default: '',
  },

  /**
   * Whether to show the `target` attribute field.
   */
  showTarget: {
    type: Boolean,
    default: true,
  },

  /**
   * Whether to show the `rel` attribute field.
   */
  showRel: {
    type: Boolean,
    default: true,
  },

  /**
   * Whether to show the query string field.
   */
  showQuery: {
    type: Boolean,
    default: true,
  },

  /**
   * Whether to show the hash field.
   */
  showHash: {
    type: Boolean,
    default: true,
  },

  /**
   * Whether the inputs are disabled.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  save: [value: { target: string; rel: string; query: string; hash: string }]
  close: [close: () => Promise<void>]
}>()

defineExpose({ close })

const popup = useTemplateRef('popup')
const targetId = useId()
const relId = useId()
const queryId = useId()
const hashId = useId()

const draftTarget = ref(props.target)
const draftRel = ref(props.rel)
const draftQuery = ref(props.query)
const draftHash = ref(props.hash)

const isDirty = computed(
  () =>
    draftTarget.value !== props.target ||
    draftRel.value !== props.rel ||
    draftQuery.value !== props.query ||
    draftHash.value !== props.hash,
)

const targetChoices = [
  { value: '', label: __('pruvious-dashboard', 'Default') },
  { value: '_blank', label: '_blank' },
  { value: '_self', label: '_self' },
  { value: '_parent', label: '_parent' },
  { value: '_top', label: '_top' },
]

const targetOptions = {
  ui: {
    description: __(
      'pruvious-dashboard',
      'Determines where the linked page opens. For example, `_blank` opens it in a new browser tab.',
    ),
  },
} as any
const relOptions = {
  ui: {
    description: __(
      'pruvious-dashboard',
      'Sets the `rel` attribute of the link. Separate multiple tokens with spaces, e.g. `noopener noreferrer`.',
    ),
  },
} as any
const queryOptions = {
  ui: {
    description: __('pruvious-dashboard', 'Added to the end of the URL after a `?`, for example `page=2&sort=asc`.'),
  },
} as any
const hashOptions = {
  ui: {
    description: __(
      'pruvious-dashboard',
      'Added to the end of the URL after a `#` to scroll to a section on the target page.',
    ),
  },
} as any

const { listen, isListening } = usePUIHotkeys({
  allowInOverlays: true,
  target: () => popup.value?.root,
  listen: false,
})

let transitionDuration = 300

onMounted(() => {
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
    listen('save', (event) => {
      event.preventDefault()
      save()
    })
  })
})

function save() {
  if (props.disabled) {
    return
  }

  if (isDirty.value) {
    emit('save', {
      target: draftTarget.value,
      rel: draftRel.value,
      query: draftQuery.value,
      hash: draftHash.value,
    })
  }

  emit('close', popup.value!.close)
}

function close() {
  emit('close', popup.value!.close)
}

function normalizeQuery(value: string): string {
  return value.replace(/^\?+/, '')
}

function normalizeHash(value: string): string {
  return value.replace(/^#+/, '')
}
</script>

<style scoped>
.p-buttons {
  justify-content: flex-end;
}
</style>
