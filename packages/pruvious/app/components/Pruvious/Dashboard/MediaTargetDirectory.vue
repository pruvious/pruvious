<template>
  <div class="p-media-target-directory" :class="[`p-media-target-directory-${level}`]">
    <div class="p-media-target-directory-buttons">
      <PUIButton
        v-pui-tooltip="__('pruvious-dashboard', 'Move into `$directory`', { directory: directory.path })"
        :disabled="directory.disabled"
        @click="$emit('select', directory)"
        variant="outline"
        class="p-media-target-directory-target-button"
      >
        {{ directory.name }}
      </PUIButton>

      <PUIButton
        v-pui-tooltip="__('pruvious-dashboard', 'New subfolder')"
        @click.stop="isCreateSubdirectoryPopupVisible = true"
        variant="outline"
        class="p-media-target-directory-subdirectory-button"
      >
        <Icon mode="svg" name="tabler:folder-plus" />
      </PUIButton>
    </div>

    <div v-if="directory.children.length" class="p-media-target-directory-children">
      <PruviousDashboardMediaTargetDirectory
        v-for="child in directory.children"
        :directory="child"
        :level="level + 1"
        @select="$emit('select', $event)"
      />
    </div>

    <PruviousDashboardCreateUploadDirectoryPopup
      v-if="isCreateSubdirectoryPopupVisible"
      :currentDirectory="directory.path"
      :title="__('pruvious-dashboard', 'New subfolder')"
      @close="$event().then(() => (isCreateSubdirectoryPopupVisible = false))"
    />
  </div>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'
import type { TargetDirectory } from './MediaFooter.vue'

defineProps({
  directory: {
    type: Object as PropType<TargetDirectory>,
    required: true,
  },
  level: {
    type: Number,
    default: 0,
  },
})

defineEmits<{
  select: [directory: TargetDirectory]
}>()

const isCreateSubdirectoryPopupVisible = ref(false)
</script>

<style scoped>
.p-media-target-directory:not(.p-media-target-directory-0) {
  padding-left: 0.75rem;
}

.p-media-target-directory:not(:first-child) {
  margin-top: 0.5rem;
}

.p-media-target-directory-buttons {
  display: flex;
  gap: 0.5rem;
}

.p-media-target-directory-target-button {
  flex-grow: 1;
  justify-content: flex-start;
}

.p-media-target-directory-subdirectory-button {
  display: none;
}

.p-media-target-directory-buttons:hover .p-media-target-directory-subdirectory-button,
.p-media-target-directory-buttons:focus-within .p-media-target-directory-subdirectory-button {
  display: inline-flex;
}

.p-media-target-directory-children {
  margin-top: 0.5rem;
}
</style>
