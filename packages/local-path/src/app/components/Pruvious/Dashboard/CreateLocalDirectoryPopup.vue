<template>
  <PUIPopup :size="-1" @close="$emit('close', $event)" ref="popup" width="26rem">
    <template #header>
      <div class="pui-row">
        <span class="pui-medium">{{ __('pruvious-dashboard', 'New folder') }}</span>
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
        <label for="p-local-directory-name">{{ __('pruvious-dashboard', 'Folder name') }}</label>
      </PUIFieldLabel>

      <PUIInput
        v-model="newDirectoryName"
        :error="!!createDirectoryError"
        :placeholder="__('pruvious-dashboard', 'e.g. my-folder')"
        @keydown.enter="createDirectory()"
        id="p-local-directory-name"
        name="p-local-directory-name"
      />

      <PruviousFieldMessage
        v-if="newDirectoryName === newDirectoryNameNormalized || createDirectoryError"
        :error="createDirectoryError"
        :options="createDirectoryFieldOptions"
        name="p-local-directory-name"
      />
      <PruviousFieldMessage
        v-else
        :key="newDirectoryNameNormalized"
        :options="{ ...createDirectoryFieldOptions, ui: { description: '-> `' + newDirectoryNameNormalized + '`' } }"
        name="p-local-directory-name"
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
import { $pfetch, __ } from '#pruvious/app'
import { slugify } from '@pruvious/utils'

const props = defineProps({
  /**
   * Absolute parent directory the new folder is created inside.
   */
  parentDir: {
    type: String,
    required: true,
  },
})

const emit = defineEmits<{
  close: [close: () => Promise<void>]
  created: [path: string]
}>()

const popup = useTemplateRef('popup')
const newDirectoryName = ref('')
const newDirectoryNameNormalized = computed(() => slugify(newDirectoryName.value.toLowerCase()))
const createDirectoryError = ref('')

onMounted(() => {
  setTimeout(() =>
    setTimeout(() =>
      setTimeout(() => {
        const potd = getComputedStyle(document.body).getPropertyValue('--pui-overlay-transition-duration')
        const transitionDuration = potd.endsWith('ms')
          ? parseInt(potd)
          : potd.endsWith('s')
            ? parseFloat(potd) * 1000
            : 300
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
})
const createDirectoryFieldOptions = {
  ui: {
    description: __(
      'pruvious-dashboard',
      'The folder name will be converted to a URL-friendly format (e.g., `My Folder` becomes `my-folder`).',
    ),
  },
} as any
const createDisabled = computed(() => !newDirectoryNameNormalized.value)

async function createDirectory() {
  if (createDisabled.value) {
    return
  }

  createDirectoryError.value = ''

  try {
    const result = (await $pfetch('/api/local-path/directory', {
      method: 'POST',
      body: { dir: props.parentDir, name: newDirectoryNameNormalized.value },
    })) as { path: string }
    emit('created', result.path)
    emit('close', popup.value!.close)
  } catch (error: any) {
    createDirectoryError.value =
      error?.data?.statusMessage ??
      error?.message ??
      __('pruvious-dashboard', 'An error occurred while creating the folder')
  }
}
</script>

<style scoped>
.p-buttons {
  justify-content: flex-end;
  margin-top: 0.75rem;
}
</style>
