<template>
  <picture v-if="isObject(image)">
    <source
      v-for="(source, index) in resolvedSources"
      :height="source.height || undefined"
      :key="index"
      :media="source.media || undefined"
      :srcset="source.srcset"
      :type="source.type"
      :width="source.width || undefined"
    />
    <img
      v-bind="imgAttrs"
      :alt="resolvedAlt"
      :decoding="decoding"
      :height="fallback.height || undefined"
      :loading="loading"
      :src="fallback.src"
      :width="fallback.width || undefined"
    />
  </picture>
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
import type { ImgHTMLAttributes } from 'vue'

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

type PruviousPictureSource =
  | ImageVariant
  | {
      /**
       * The variant name (a key of `pruvious.images.variants`) or an inline
       * `ImageVariantOptions` object. When omitted, the original upload is used.
       */
      variant?: ImageVariant | ImageVariantOptions

      /**
       * A media query that selects this source (e.g. `'(max-width: 768px)'`).
       * The last source in the list should typically omit `media` so it acts as
       * the default - it is also used as the `<img>` fallback.
       */
      media?: string

      /**
       * Overrides the `type` attribute on the `<source>` element.
       * Defaults to the MIME type derived from the variant's `format`.
       */
      type?: string
    }

const mimeByFormat: Record<string, string> = {
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
  avif: 'image/avif',
  gif: 'image/gif',
}

const props = defineProps({
  /**
   * The populated image record returned by an `imageField` (or a compatible shape).
   */
  image: {
    type: Object as PropType<PruviousImageInput | null | undefined>,
    default: null,
  },

  /**
   * Ordered list of `<source>` elements to render inside the `<picture>`.
   * Each entry may be a bare variant name or a full source descriptor.
   * The final entry doubles as the `<img>` fallback - its variant determines
   * the rendered image when none of the media queries match.
   */
  sources: {
    type: Array as PropType<PruviousPictureSource[]>,
    default: () => [],
  },

  /**
   * Extra attributes to spread onto the inner fallback `<img>` element
   * (e.g. `class`, `style`, `id`, `crossorigin`). Useful when the picture's
   * own root element should not receive these.
   */
  imgAttrs: {
    type: Object as PropType<ImgHTMLAttributes>,
    default: () => ({}),
  },

  /**
   * Overrides the `alt` attribute on the inner `<img>`. When omitted, the
   * image's `description` is used (resolved against the active language).
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

function resolveVariant(value: ImageVariant | ImageVariantOptions | undefined): Required<ImageVariantOptions> | null {
  if (isString(value)) {
    const variant = (imageVariants as Record<string, Required<ImageVariantOptions>>)[value]
    if (isUndefined(variant)) {
      if (import.meta.dev) {
        console.warn(`[<PruviousPicture>] Unknown image variant "${value}". Falling back to the original upload.`)
      }
      return null
    }
    return variant
  }
  if (isObject(value)) {
    return normalizeImageVariantOptions(value)
  }
  return null
}

interface ResolvedSource {
  media: string
  srcset: string
  type: string | undefined
  width: number
  height: number
  options: Required<ImageVariantOptions> | null
}

function resolveSource(entry: PruviousPictureSource, image: PruviousImageInput): ResolvedSource {
  const descriptor = isString(entry) ? { variant: entry } : entry
  const options = resolveVariant(descriptor.variant)
  const source = { width: image.imageWidth ?? 0, height: image.imageHeight ?? 0 }
  const dims = isNotNull(options) ? resolveImageVariantDimensions(source, options) : source
  const srcset = isNotNull(options) ? resolveImageVariantPath(image, options) : resolveUploadPath(image.path)
  const type = descriptor.type ?? (isNotNull(options) ? mimeByFormat[options.format] : image.mime)

  return {
    media: descriptor.media ?? '',
    srcset,
    type,
    width: dims.width,
    height: dims.height,
    options,
  }
}

const resolvedSources = computed<ResolvedSource[]>(() =>
  props.sources.map((entry) => resolveSource(entry, props.image!)),
)

const fallback = computed(() => {
  const last = resolvedSources.value[resolvedSources.value.length - 1]
  if (isObject(last)) {
    return { src: last.srcset, width: last.width, height: last.height }
  }
  const image = props.image!
  return {
    src: resolveUploadPath(image.path),
    width: image.imageWidth ?? 0,
    height: image.imageHeight ?? 0,
  }
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
