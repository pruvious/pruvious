<template>
  <img
    v-if="isObject(image)"
    :alt="resolvedAlt"
    :decoding="decoding"
    :height="dims.height || undefined"
    :loading="loading"
    :src="src"
    :width="dims.width || undefined"
  />
</template>

<script lang="ts" setup>
import {
  imageVariants,
  normalizeImageVariantOptions,
  resolveImageVariantDimensions,
  resolveImageVariantPath,
  resolveUploadPath,
  useLanguage,
  type ImageVariant,
  type ImageVariantOptions,
} from '#pruvious/app'
import { isNotNull, isObject, isString, isUndefined } from '@pruvious/utils'

interface PruviousImageInput {
  /**
   * The upload's path in the media library (e.g. `'/photos/sunset.jpg'`).
   * Used to construct the rendered URL.
   */
  path: string

  /**
   * The upload's MIME type (e.g. `'image/jpeg'`). Used to decide whether the
   * image can be transformed into a variant - non-optimizable types render
   * the original file.
   */
  mime: string

  /**
   * Intrinsic width of the original image in pixels. Used to compute the
   * rendered dimensions for the `width` attribute and to avoid layout shift.
   */
  imageWidth?: number

  /**
   * Intrinsic height of the original image in pixels. Used to compute the
   * rendered dimensions for the `height` attribute and to avoid layout shift.
   */
  imageHeight?: number

  /**
   * Optional alt-text source. Accepts either a plain string or a translatable
   * object keyed by language code (as returned by the `imageField` populator).
   * Used when no explicit `alt` prop is provided.
   */
  description?: string | Record<string, string> | null
}

const props = defineProps({
  /**
   * The populated image record returned by an `imageField` (or a compatible shape).
   *
   * Required fields are `path` and `mime`; `imageWidth`, `imageHeight`, and
   * `description` are used opportunistically when present.
   */
  image: {
    type: Object as PropType<PruviousImageInput | null | undefined>,
    default: null,
  },

  /**
   * The image variant to render. You can pass:
   *
   * - An `ImageVariant` key from `pruvious.images.variants`.
   * - An inline `ImageVariantOptions` object.
   * - `undefined` to render the original upload.
   */
  variant: {
    type: [String, Object] as PropType<ImageVariant | ImageVariantOptions | undefined>,
    default: undefined,
  },

  /**
   * Overrides the `alt` attribute. When omitted, the image's `description` is
   * used (resolved against the active language for translatable descriptions).
   */
  alt: {
    type: String as PropType<string | undefined>,
    default: undefined,
  },

  /**
   * The `loading` attribute on the rendered `<img>` element.
   *
   * @default 'lazy'
   */
  loading: {
    type: String as PropType<'lazy' | 'eager'>,
    default: 'lazy',
  },

  /**
   * The `decoding` attribute on the rendered `<img>` element.
   *
   * @default 'async'
   */
  decoding: {
    type: String as PropType<'sync' | 'async' | 'auto'>,
    default: 'async',
  },
})

const language = useLanguage()

const resolvedOptions = computed<Required<ImageVariantOptions> | null>(() => {
  if (isString(props.variant)) {
    const variant = (imageVariants as Record<string, Required<ImageVariantOptions>>)[props.variant]
    if (isUndefined(variant)) {
      if (import.meta.dev) {
        console.warn(`[<PruviousImage>] Unknown image variant "${props.variant}". Falling back to the original upload.`)
      }
      return null
    }
    return variant
  }
  if (isObject(props.variant)) {
    return normalizeImageVariantOptions(props.variant)
  }
  return null
})

const src = computed(() => {
  if (isNotNull(resolvedOptions.value)) {
    return resolveImageVariantPath(props.image!, resolvedOptions.value)
  }
  return resolveUploadPath(props.image!.path)
})

const dims = computed(() => {
  const image = props.image!
  const source = { width: image.imageWidth ?? 0, height: image.imageHeight ?? 0 }
  if (isNotNull(resolvedOptions.value)) {
    return resolveImageVariantDimensions(source, resolvedOptions.value)
  }
  return source
})

const resolvedAlt = computed(() => {
  if (isString(props.alt)) {
    return props.alt
  }
  const description = props.image?.description
  if (isString(description)) {
    return description
  }
  if (isObject(description)) {
    return description[language.value] ?? ''
  }
  return ''
})
</script>
