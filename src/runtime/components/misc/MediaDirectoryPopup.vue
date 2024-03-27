<template>
  <PruviousPopup v-model:visible="visible" :order="1" @hotkey="onHotkey" width="24rem">
    <template #header>
      <h2 class="truncate text-sm">
        {{
          action === 'create' ? __('pruvious-dashboard', 'Add new folder') : __('pruvious-dashboard', 'Rename folder')
        }}
      </h2>
    </template>

    <form @submit.prevent="action === 'create' ? create() : rename()" class="flex flex-col gap-4 p-4">
      <component
        v-model="name"
        :errors="errors"
        :is="TextField"
        :options="{
          label: action === 'create' ? __('pruvious-dashboard', 'Name') : __('pruvious-dashboard', 'New name'),
        }"
        fieldKey="name"
      />

      <div class="flex justify-end gap-2">
        <button @click="close()" type="button" class="button button-white">
          <span>{{ __('pruvious-dashboard', 'Cancel') }}</span>
        </button>
        <button type="submit" class="button">
          <span>
            {{ action === 'create' ? __('pruvious-dashboard', 'Create') : __('pruvious-dashboard', 'Rename') }}
          </span>
        </button>
      </div>
    </form>
  </PruviousPopup>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import type { CastedFieldType } from '#pruvious'
import { dashboardMiscComponent, textFieldComponent } from '#pruvious/dashboard'
import type { HotkeyAction } from '../../composables/dashboard/hotkeys'
import { useMediaDirectories, useMediaDirectoryPopup, useMediaUpdated } from '../../composables/dashboard/media'
import { pruviousToasterShow } from '../../composables/dashboard/toaster'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { addMediaDirectories, listMediaDirectory, renameMediaDirectory } from '../../utils/dashboard/media-directory'
import { pruviousFetch } from '../../utils/fetch'
import { isUrlPath } from '../../utils/string'
import { parseMediaDirectoryName } from '../../utils/uploads'

const mediaDirectoryPopup = useMediaDirectoryPopup()
const mediaDirectories = useMediaDirectories()
const mediaUpdated = useMediaUpdated()

const action = ref<'create' | 'rename'>('create')
const errors = ref<{ name?: string }>()
const name = ref('')
const parent = ref('')
const prevPath = ref('')
const visible = ref(false)

const PruviousPopup = dashboardMiscComponent.Popup()
const TextField = textFieldComponent()

await loadTranslatableStrings('pruvious-dashboard')

watch(mediaDirectoryPopup, () => {
  visible.value = !!mediaDirectoryPopup.value

  if (mediaDirectoryPopup.value?.action === 'create') {
    action.value = 'create'
    errors.value = {}
    name.value = ''
    parent.value = mediaDirectoryPopup.value.parentDirectory
    prevPath.value = ''
  } else if (mediaDirectoryPopup.value?.action === 'rename') {
    action.value = 'rename'
    errors.value = {}
    name.value = mediaDirectoryPopup.value.directory.slice(0, -1).split('/').pop() || ''
    parent.value = parseMediaDirectoryName(
      mediaDirectoryPopup.value.directory.slice(0, -1).split('/').slice(0, -1).join('/'),
    )
    prevPath.value = mediaDirectoryPopup.value.directory
  }
})

function create() {
  const validated = validate()

  if (validated) {
    addMediaDirectories(validated, mediaDirectories.value)
    pruviousToasterShow({ message: __('pruvious-dashboard', 'Folder created') })
    mediaUpdated.value++
    close()
  }
}

async function rename() {
  const validated = validate()

  if (validated) {
    const response = await pruviousFetch<{ records: CastedFieldType['uploads'][] }>('collections/uploads', {
      query: { where: `some:[directory[=][${prevPath.value}],directory[like][${prevPath.value}%]]` },
    })

    if (response.success) {
      const promises: Promise<any>[] = []

      for (const { id, directory, filename } of response.data.records) {
        promises.push(
          pruviousFetch(`collections/uploads/${id}`, {
            method: 'patch',
            body: { directory: directory.replace(prevPath.value, validated), filename },
          }),
        )
      }

      await Promise.all(promises)

      renameMediaDirectory(prevPath.value, validated, mediaDirectories.value)
      pruviousToasterShow({ message: __('pruvious-dashboard', 'Folder renamed') })
      mediaUpdated.value++
      close()
    }
  }
}

function validate(): string | false {
  const trimmed = name.value.trim()
  errors.value = {}

  if (!trimmed) {
    errors.value.name = __('pruvious-dashboard', 'This field is required')
  } else if (trimmed.toLowerCase() !== trimmed || !isUrlPath(trimmed, true)) {
    errors.value.name = __('pruvious-dashboard', 'The folder name must be lowercase and URL-friendly')
  } else {
    const parsed = parseMediaDirectoryName(parent.value + trimmed)

    if (prevPath.value !== parsed && listMediaDirectory(parsed, mediaDirectories.value)) {
      errors.value.name = __('pruvious-dashboard', 'A folder with this name already exists')
    } else {
      return parsed
    }
  }

  return false
}

function close() {
  mediaDirectoryPopup.value = null
}

function onHotkey(hotkeyAction: HotkeyAction) {
  if (hotkeyAction === 'close') {
    close()
  } else if (hotkeyAction === 'save') {
    if (action.value === 'create') {
      create()
    } else if (action.value === 'rename') {
      rename()
    }
  }
}
</script>
