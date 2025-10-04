<template>
  <div v-if="canCreate">
    <div class="pui-row">
      <input @change="uploadFiles()" hidden id="p-file-input" multiple ref="fileInput" type="file" />

      <PUIButton
        v-pui-tooltip="__('pruvious-dashboard', 'New folder')"
        @click.stop="openCreateDirectoryPopup()"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:folder-plus" />
      </PUIButton>

      <PUIButton @click.stop="fileInput?.click()" variant="primary">
        <span>{{ __('pruvious-dashboard', 'Upload') }}</span>
        <Icon mode="svg" name="tabler:upload" />
      </PUIButton>
    </div>

    <PUIPopup
      v-if="createDirectoryPopupVisible"
      :size="-1"
      @close="$event().then(() => (createDirectoryPopupVisible = false))"
      ref="createDirectoryPopup"
      width="26rem"
    >
      <template #header>
        <div class="pui-row">
          <span>{{ __('pruvious-dashboard', 'New folder') }}</span>

          <PUIButton
            :size="-2"
            :title="__('pruvious-dashboard', 'Close')"
            @click="closeCreateDirectoryPopup()"
            variant="ghost"
            class="pui-ml-auto"
          >
            <Icon mode="svg" name="tabler:x" />
          </PUIButton>
        </div>
      </template>

      <PUIField>
        <PUIFieldLabel required>
          <label for="name">{{ __('pruvious-dashboard', 'Folder name') }}</label>
        </PUIFieldLabel>

        <PUIInput
          v-model="newDirectoryName"
          :placeholder="__('pruvious-dashboard', 'e.g. my-folder')"
          @keydown.enter="createDirectory()"
          autofocus
          id="name"
          name="name"
        />

        <PruviousFieldMessage :error="createDirectoryError" :options="createDirectoryFieldOptions" name="name" />
      </PUIField>

      <div class="p-create-upload-directory-popup-buttons pui-row">
        <PUIButton
          @click="createDirectoryPopup?.close().then(() => (createDirectoryPopupVisible = false))"
          variant="outline"
        >
          {{ __('pruvious-dashboard', 'Cancel') }}
        </PUIButton>

        <PUIButton :disabled="!newDirectoryName.trim()" @click="createDirectory()">
          {{ __('pruvious-dashboard', 'Create') }}
        </PUIButton>
      </div>
    </PUIPopup>
  </div>
</template>

<script lang="ts" setup>
import { __, createUploadDirectory, hasPermission, useUpload, type DashboardMediaLibraryState } from '#pruvious/client'
import { puiToast } from '@pruvious/ui/pui/toast'
import { isEmpty } from '@pruvious/utils'
import { relative } from 'pathe'

const props = defineProps({
  state: {
    type: Object as PropType<DashboardMediaLibraryState>,
    required: true,
  },
})

const fileInput = useTemplateRef('fileInput')
const createDirectoryPopup = useTemplateRef('createDirectoryPopup')
const canCreate = hasPermission('collection:uploads:create')
const newDirectoryName = ref('')
const createDirectoryPopupVisible = ref(false)
const createDirectoryError = ref('')
const createDirectoryFieldOptions = {
  ui: {
    description: __(
      'pruvious-dashboard',
      'The folder name will be converted to a URL-friendly format (e.g., `My Folder` becomes `my-folder`).',
    ),
  },
} as any

async function createDirectory() {
  const result = await createUploadDirectory(newDirectoryName.value)
  if (result.success) {
    const relativePath = relative(props.state.currentDirectory, result.data.path)
    puiToast(
      __('pruvious-dashboard', 'Folder `$name` has been created', {
        name: relativePath.startsWith('.') ? result.data.path : relativePath,
      }),
      { type: 'success' },
    )
    closeCreateDirectoryPopup()
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

function openCreateDirectoryPopup() {
  newDirectoryName.value = ''
  createDirectoryError.value = ''
  createDirectoryPopupVisible.value = true
}

function closeCreateDirectoryPopup() {
  createDirectoryPopup.value?.close().then(() => (createDirectoryPopupVisible.value = false))
}

async function uploadFiles() {
  if (fileInput.value?.files && fileInput.value.files.length > 0) {
    useUpload([...fileInput.value.files], { returning: ['id', 'path'] })
  }
}
</script>

<style scoped>
.p-create-upload-directory-popup-buttons {
  justify-content: flex-end;
  margin-top: 0.75rem;
}
</style>
