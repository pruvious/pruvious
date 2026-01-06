<template>
  <PUIPopup :size="-1" @close="$emit('close', $event)" ref="popup" width="26rem">
    <template #header>
      <div class="pui-row">
        <span class="pui-medium">{{ title || __('pruvious-dashboard', 'New folder') }}</span>
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

    <PUIField>
      <PUIFieldLabel required>
        <label for="p-upload-directory-name">{{ __('pruvious-dashboard', 'Folder name') }}</label>
      </PUIFieldLabel>

      <PUIInput
        v-model="newDirectoryName"
        :placeholder="__('pruvious-dashboard', 'e.g. my-folder')"
        @keydown.enter="createDirectory()"
        id="p-upload-directory-name"
        name="p-upload-directory-name"
      />

      <PruviousFieldMessage
        v-if="newDirectoryName === newDirectoryNameNormalized || createDirectoryError"
        :error="createDirectoryError"
        :options="createDirectoryFieldOptions"
        name="p-upload-directory-name"
      />
      <PruviousFieldMessage
        v-else
        :key="newDirectoryNameNormalized"
        :options="{ ...createDirectoryFieldOptions, ui: { description: '-> `' + newDirectoryNameNormalized + '`' } }"
        name="p-upload-directory-name"
      />
    </PUIField>

    <div class="p-buttons pui-row">
      <PUIButton @click="$emit('close', popup!.close)" variant="outline">
        {{ __('pruvious-dashboard', 'Cancel') }}
      </PUIButton>

      <PUIButton :disabled="createDisabled" @click="createDirectory()">
        {{ __('pruvious-dashboard', 'Create') }}
      </PUIButton>
    </div>
  </PUIPopup>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import { createUploadDirectory } from '#pruvious/dashboard'
import { usePUIHotkeys } from '@pruvious/ui/pui/hotkeys'
import { puiToast } from '@pruvious/ui/pui/toast'
import { isEmpty, slugify } from '@pruvious/utils'
import { join, relative } from 'pathe'

const props = defineProps({
  currentDirectory: {
    type: String,
    required: true,
  },
  title: {
    type: String,
  },
})

const emit = defineEmits<{
  close: [close: () => Promise<void>]
}>()

defineExpose({ close })

const popup = useTemplateRef('popup')
const newDirectoryName = ref('')
const newDirectoryNameNormalized = computed(() => slugify(newDirectoryName.value.toLowerCase()))
const createDirectoryError = ref('')
const createDirectoryFieldOptions = {
  ui: {
    description: __(
      'pruvious-dashboard',
      'The folder name will be converted to a URL-friendly format (e.g., `My Folder` becomes `my-folder`).',
    ),
  },
} as any
const createDisabled = computed(() => !newDirectoryNameNormalized.value)
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
    listen('save', (e) => {
      e.preventDefault()
      createDirectory()
    })
  })
})

async function createDirectory() {
  if (createDisabled.value) {
    return
  }

  const result = await createUploadDirectory(join(props.currentDirectory, newDirectoryNameNormalized.value))

  if (result.success) {
    const relativePath = relative(props.currentDirectory, result.data.path)
    puiToast(
      __('pruvious-dashboard', 'Folder `$name` has been created', {
        name: relativePath.startsWith('.') ? result.data.path : relativePath,
      }),
      { type: 'success' },
    )
    emit('close', popup.value!.close)
  } else {
    if (result.runtimeError) {
      createDirectoryError.value = result.runtimeError
    } else if (!isEmpty(result.inputErrors)) {
      createDirectoryError.value = Object.values(result.inputErrors)[0] as string
    } else {
      puiToast(__('pruvious-dashboard', 'An error occurred while creating the folder'), { type: 'error' })
    }
  }
}

async function close() {
  emit('close', popup.value!.close)
}
</script>

<style scoped>
.p-buttons {
  justify-content: flex-end;
  margin-top: 0.75rem;
}
</style>
