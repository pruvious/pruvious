<template>
  <div v-if="canCreate">
    <div class="pui-row">
      <input @change="uploadFiles()" hidden id="p-file-input" multiple ref="fileInput" type="file" />

      <PUIButton
        v-pui-tooltip="__('pruvious-dashboard', 'New folder')"
        @click.stop="isCreateDirectoryPopupVisible = true"
        variant="outline"
      >
        <Icon mode="svg" name="tabler:folder-plus" />
      </PUIButton>

      <PUIButton @click.stop="fileInput?.click()" variant="primary">
        <span>{{ __('pruvious-dashboard', 'Upload') }}</span>
        <Icon mode="svg" name="tabler:upload" />
      </PUIButton>
    </div>

    <PruviousDashboardCreateUploadDirectoryPopup
      v-if="isCreateDirectoryPopupVisible"
      :currentDirectory="state.currentDirectory"
      @close="$event().then(() => (isCreateDirectoryPopupVisible = false))"
    />
  </div>
</template>

<script lang="ts" setup>
import { __, hasPermission } from '#pruvious/app'
import { useUpload, type DashboardMediaLibraryState } from '#pruvious/dashboard'

const props = defineProps({
  state: {
    type: Object as PropType<DashboardMediaLibraryState>,
    required: true,
  },
})

const fileInput = useTemplateRef('fileInput')
const canCreate = hasPermission('collection:uploads:create')
const isCreateDirectoryPopupVisible = ref(false)

async function uploadFiles() {
  if (fileInput.value?.files && fileInput.value.files.length > 0) {
    useUpload(
      [...fileInput.value.files].map((file) => ({ file, directory: props.state.currentDirectory })),
      { returning: ['id', 'path'] },
    )
    fileInput.value.value = ''
  }
}
</script>
