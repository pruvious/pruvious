<template>
  <PruviousPopup v-model:visible="visible" :order="1" @hotkey="onHotkey" width="24rem">
    <template #header>
      <h2 class="truncate text-sm">
        {{ __('pruvious-dashboard', 'Edit file') }}
      </h2>
    </template>

    <form v-if="upload" @submit.prevent="edit()" class="flex flex-col gap-4 p-4">
      <component
        v-model="upload.filename"
        :errors="errors"
        :is="TextField"
        :options="{
          label: dashboard.collections.uploads.fields.filename.options.label,
          description: dashboard.collections.uploads.fields.filename.options.description,
          required: true,
        }"
        fieldKey="filename"
      />

      <component
        v-model="upload.description"
        :errors="errors"
        :is="TextField"
        :options="{
          label: dashboard.collections.uploads.fields.description.options.label,
          description: isImage
            ? __('pruvious-dashboard', 'The default **alt** attribute value for the image')
            : undefined,
        }"
        fieldKey="description"
      />

      <div class="flex justify-end gap-2">
        <button @click="close()" type="button" class="button button-white">
          <span>{{ __('pruvious-dashboard', 'Cancel') }}</span>
        </button>
        <button type="submit" class="button">
          <span>
            {{ __('pruvious-dashboard', 'Save') }}
          </span>
        </button>
      </div>
    </form>
  </PruviousPopup>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import { imageTypes, type CastedFieldType } from '#pruvious'
import { textFieldComponent } from '#pruvious/dashboard'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import type { HotkeyAction } from '../../composables/dashboard/hotkeys'
import { useMediaUpdated, useMediaUploadPopup } from '../../composables/dashboard/media'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousFetch } from '../../utils/fetch'
import { isObject, objectPick } from '../../utils/object'

const dashboard = usePruviousDashboard()
const mediaUploadPopup = useMediaUploadPopup()
const mediaUpdated = useMediaUpdated()

const action = ref<'create' | 'edit'>('create')
const errors = ref<Record<string, string>>({})
const isImage = ref(false)
const upload = ref<Pick<CastedFieldType['uploads'], 'id' | 'filename' | 'directory' | 'description'>>()
const visible = ref(false)

const TextField = textFieldComponent()

await loadTranslatableStrings('pruvious-dashboard')

watch(mediaUploadPopup, () => {
  if (mediaUploadPopup.value) {
    action.value = 'edit'
    errors.value = {}
    isImage.value = imageTypes.includes(mediaUploadPopup.value.upload.type)
    upload.value = objectPick(mediaUploadPopup.value.upload, ['id', 'filename', 'directory', 'description'])
    visible.value = true
  } else {
    visible.value = false
  }
})

async function edit() {
  if (upload.value) {
    const response = await pruviousFetch(`collections/uploads/${upload.value.id}`, {
      method: 'patch',
      body: upload.value,
    })

    if (response.success) {
      pruviousToasterShow({ message: __('pruvious-dashboard', 'File updated') })
      mediaUpdated.value++
      close()
    } else if (isObject(response.error)) {
      errors.value = response.error
    }
  }
}

function close() {
  mediaUploadPopup.value = null
}

function onHotkey(action: HotkeyAction) {
  if (action === 'close') {
    close()
  } else if (action === 'save') {
    edit()
  }
}
</script>
