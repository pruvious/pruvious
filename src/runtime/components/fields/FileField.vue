<template>
  <div ref="rootEl" class="relative flex w-full flex-col items-start gap-1">
    <div v-if="options.label || options.description" class="flex w-full items-end justify-between gap-4">
      <div v-if="options.label" :for="id" class="flex gap-1 whitespace-nowrap text-vs font-medium text-gray-900">
        <span v-if="options.required" :title="__('pruvious-dashboard', 'Required')" class="text-red-500">*</span>
        <span>{{ __('pruvious-dashboard', options.label as any) }}</span>
      </div>

      <PruviousIconHelp
        v-if="options.description"
        v-pruvious-tooltip="__('pruvious-dashboard', options.description as any)"
        class="mb-0.5 h-4 w-4 shrink-0 text-gray-400"
      />
    </div>

    <div v-if="loaded && !modelValue" class="flex w-full gap-1.5">
      <button :disabled="disabled" @click="openPopup()" type="button" class="button button-white">
        {{ __('pruvious-dashboard', 'Select from media library') }}
      </button>

      <button
        v-if="canCreate"
        v-pruvious-tooltip="__('pruvious-dashboard', 'Upload')"
        :disabled="disabled"
        @click="openPopupAndUpload()"
        type="button"
        class="button button-white button-square"
      >
        <PruviousIconUpload />
      </button>
    </div>

    <div v-if="loaded && modelValue" class="flex w-full">
      <div
        class="relative flex h-20 w-20 shrink-0 rounded-[0.4375rem] border bg-white before:absolute before:inset-0 before:rounded-md before:bg-gray-900 before:opacity-0 before:transition"
        :class="{
          'pointer-events-none': !upload,
          'hover:before:opacity-50': upload?.isImage,
        }"
        :style="{ backgroundImage: upload?.isImage ? `url(${backgroundImage})` : undefined }"
      >
        <PruviousImagePreview v-if="upload?.isImage" :upload="upload" />

        <PruviousIconFile
          v-if="!upload?.isImage"
          class="pointer-events-none relative m-auto h-5 w-5 transition group-hover:text-primary-700"
        />
      </div>

      <div class="flex flex-1 flex-col items-start justify-center gap-2 overflow-hidden pl-3">
        <div v-if="upload" class="w-full">
          <p :title="upload.directory + upload.filename" class="truncate text-sm">{{ upload.filename }}</p>
        </div>

        <div v-if="upload" class="flex gap-1.5">
          <button :disabled="disabled" @click="openPopup()" type="button" class="button button-white button-sm">
            {{ __('pruvious-dashboard', 'Replace') }}
          </button>
          <a
            v-pruvious-tooltip="__('pruvious-dashboard', 'Open in new tab')"
            :href="runtimeConfig.public.pruvious.uploadsBase + upload.directory + upload.filename"
            target="_blank"
            class="button button-white button-square-sm"
          >
            <PruviousIconExternalLink />
          </a>
          <button
            v-pruvious-tooltip="__('pruvious-dashboard', 'Remove')"
            :disabled="disabled"
            @click="$emit('update:modelValue', null)"
            type="button"
            class="button button-white-red button-square-sm"
          >
            <PruviousIconX />
          </button>
        </div>
      </div>
    </div>

    <PruviousInputError :errors="errors" :fieldKey="fieldKey" />
  </div>
</template>

<script lang="ts" setup>
import { ref, useRuntimeConfig, watch } from '#imports'
import type { CastedFieldType, StandardFieldOptions } from '#pruvious'
import { dashboardMiscComponent } from '#pruvious/dashboard'
import backgroundImage from '../../assets/image-background.png'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import {
  openMediaLibraryPopup,
  openUploadDialog,
  useLastMediaDirectory,
  useMediaUpdated,
  type MediaLibraryPopupOptions,
  type MediaUpload,
} from '../../composables/dashboard/media'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { pruviousUnique } from '../../composables/unique'
import { useUser } from '../../composables/user'
import { pruviousFetch } from '../../utils/fetch'
import { imageTypes } from '../../utils/uploads'
import { getCapabilities } from '../../utils/users'

const props = defineProps<{
  /**
   * Represents the value of the field.
   */
  modelValue: number | null

  /**
   * Represents the options of the field as defined in the field definition.
   */
  options: StandardFieldOptions['file']

  /**
   * Represents the unique identifier of the field within the form.
   * If not provided, a unique identifier will be automatically generated.
   */
  fieldKey?: string

  /**
   * Represents a dictionary of all errors, where the key is the complete field name and the value is the associated error message.
   * The field name is represented in dot-notation (e.g., `repeater.0.subfieldName`).
   */
  errors?: Record<string, string>

  /**
   * Indicates whether the field is disabled.
   * By default, the field is enabled.
   */
  disabled?: boolean

  /**
   * When set to `true`, the field will won't autofocus in popups.
   */
  ignoreAutofocus?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [number | null]
}>()

const dashboard = usePruviousDashboard()
const lastMediaDirectory = useLastMediaDirectory()
const mediaUpdated = useMediaUpdated()
const runtimeConfig = useRuntimeConfig()
const user = useUser()

const editingAltText = ref(false)
const id = pruviousUnique('file-field')
const loaded = ref(false)
const popupOptions: MediaLibraryPopupOptions = {
  allowedTypes: props.options.allowedTypes,
  directory: '',
  pickCallback: (upload) => {
    if (upload.id !== props.modelValue) {
      emit('update:modelValue', upload.id)
      editingAltText.value = false
    }
  },
}
const rootEl = ref<HTMLDivElement>()
const upload = ref<MediaUpload | null>(null)
const userCapabilities = getCapabilities(user.value)

const canCreate =
  dashboard.value.collections.uploads.apiRoutes.create &&
  (user.value?.isAdmin || userCapabilities['collection-uploads-create'])

const PruviousImagePreview = dashboardMiscComponent.ImagePreview()
const PruviousInputError = dashboardMiscComponent.InputError()

await loadTranslatableStrings('pruvious-dashboard')

watch(() => props.modelValue, refresh, { immediate: true })
watch(mediaUpdated, refresh)
watch(lastMediaDirectory, (value) => (popupOptions.directory = value), { immediate: true })

async function refresh() {
  if (props.modelValue) {
    const response = await pruviousFetch<CastedFieldType['uploads']>(`collections/uploads/${props.modelValue}`, {
      dispatchEvents: false,
    })

    if (response.success) {
      upload.value = {
        extension: response.data.filename.split('.').pop() ?? '',
        isImage: imageTypes.includes(response.data.type),
        ...response.data,
      }
    } else {
      upload.value = null
      emit('update:modelValue', null)
    }
  } else {
    upload.value = null
    emit('update:modelValue', null)
  }

  loaded.value = true
}

function openPopup() {
  openMediaLibraryPopup(popupOptions)
}

function openPopupAndUpload() {
  openPopup()
  openUploadDialog(popupOptions.directory ?? '', props.options.allowedTypes)
}
</script>
