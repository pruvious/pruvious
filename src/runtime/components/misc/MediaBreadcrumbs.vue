<template>
  <ul class="flex gap-1 overflow-hidden text-sm">
    <li>
      <button
        v-if="directory"
        :title="__('pruvious-dashboard', 'Open root folder')"
        @click="$emit('openDirectory', '')"
        data-ignore-autofocus
        type="button"
        class="text-gray-400 outline-none transition hocus:text-primary-700"
      >
        {{ rootLabel }}
      </button>

      <span v-if="!directory" :title="__('pruvious-dashboard', 'Root folder')">{{ rootLabel }}</span>
    </li>

    <li
      v-for="{ name, path } of parentDirectories"
      class="flex gap-1 overflow-hidden truncate before:font-normal before:text-gray-400 before:content-['/']"
    >
      <button
        :title="__('pruvious-dashboard', 'Open $item', { item: name })"
        @click="$emit('openDirectory', path)"
        data-ignore-autofocus
        type="button"
        class="truncate text-gray-400 outline-none transition hocus:text-primary-700"
      >
        {{ name }}
      </button>
    </li>

    <li
      v-if="currentDirectoryName"
      class="flex gap-1 truncate before:font-normal before:text-gray-400 before:content-['/']"
    >
      <span class="truncate">{{ currentDirectoryName }}</span>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import type { MediaDirectory } from '../../composables/dashboard/media'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'

const props = defineProps({
  directory: {
    type: String,
    required: true,
  },
  rootLabel: {
    type: String,
    required: true,
  },
})

defineEmits<{
  openDirectory: [string]
}>()

const currentDirectoryName = ref('')
const parentDirectories = ref<MediaDirectory[]>([])

await loadTranslatableStrings('pruvious-dashboard')

watch(
  () => props.directory,
  () => {
    const directories = props.directory.split('/').filter(Boolean)

    currentDirectoryName.value = directories[directories.length - 1] || ''
    parentDirectories.value = directories.slice(0, -1).map((directory, i) => {
      const path = directories.slice(0, i + 1).join('/')
      return { name: directory, path: path ? `${path}/` : '' }
    })
  },
  { immediate: true },
)
</script>
