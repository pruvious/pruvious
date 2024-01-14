<template>
  <input
    :accept="uploadDialog.accept"
    @change="onFileInputChange($event)"
    id="media-upload-input"
    multiple
    name="media-upload-input"
    ref="inputEl"
    type="file"
    class="invisible absolute h-0 w-0"
  />
</template>

<script lang="ts" setup>
import { nextTick, ref, useRuntimeConfig, watch } from '#imports'
import { upload, useMediaUpdated, useUploadDialog } from '../../composables/dashboard/media'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { format } from '../../utils/bytes'

const uploadDialog = useUploadDialog()
const mediaUpdated = useMediaUpdated()
const runtimeConfig = useRuntimeConfig()

const inputEl = ref<HTMLInputElement>()
const uploadLimitString = format(runtimeConfig.public.pruvious.uploadLimit)!

await loadTranslatableStrings('pruvious-dashboard')

watch(uploadDialog, () => {
  nextTick(() => inputEl.value?.click())
})

/**
 * Handle file uploads from the upload dialog (`<input type="file">`).
 */
async function onFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files ?? []).filter((file) => {
    if (file.size > runtimeConfig.public.pruvious.uploadLimit) {
      pruviousToasterShow({
        message: __('pruvious-dashboard', 'The file **$file** exceeds the upload limit of $limit', {
          file: file.name,
          limit: uploadLimitString,
        }),
        type: 'error',
      })
      return false
    }

    return true
  })

  target.value = ''

  if (files.length) {
    const uploaded = await upload(files.map((file) => ({ $file: file, directory: uploadDialog.value.directory })))

    if (uploaded) {
      mediaUpdated.value++
      pruviousToasterShow({ message: __('pruvious-dashboard', 'Uploaded $count $files', { count: uploaded }) })
    }
  }
}
</script>
