<template>
  <div v-if="canCreate" class="pui-row">
    <input @change="uploadFiles()" hidden id="p-file-input" multiple ref="fileInput" type="file" />

    <PUIButton
      v-pui-tooltip="__('pruvious-dashboard', 'New folder')"
      @click.stop="console.log('@todo')"
      variant="outline"
    >
      <Icon mode="svg" name="tabler:folder-plus" />
    </PUIButton>

    <PUIButton @click.stop="fileInput?.click()" variant="primary">
      <span>{{ __('pruvious-dashboard', 'Upload') }}</span>
      <Icon mode="svg" name="tabler:upload" />
    </PUIButton>
  </div>
</template>

<script lang="ts" setup>
import { __, hasPermission, useUpload, type DashboardMediaLibraryState } from '#pruvious/client'

defineProps({
  state: {
    type: Object as PropType<DashboardMediaLibraryState>,
    required: true,
  },
})

const fileInput = useTemplateRef('fileInput')
const canCreate = hasPermission('collection:uploads:create')

async function uploadFiles() {
  if (fileInput.value?.files && fileInput.value.files.length > 0) {
    useUpload([...fileInput.value.files], { returning: ['id', 'path'] })
  }
}
</script>
