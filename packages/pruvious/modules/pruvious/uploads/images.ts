import { isBoolean, isDefined, isPositiveInteger, isRealNumber, isUndefined, nanoid } from '@pruvious/utils'
import { extname } from 'pathe'
import { isWorkerd } from 'std-env'
import { normalizeImageTransformOptions, type ImageTransformOptions, type ImageVariantOptions } from './images.shared'

export {
  generateOptimizedImagePath,
  normalizeImageTransformOptions,
  normalizeOptimizedImagePath,
  parseImageTransformOptions,
  resolveImageVariantDimensions,
  stringifyImageTransformOptions,
  type ImageTransformOptions,
  type ImageVariantOptions,
} from './images.shared'

/**
 * Validates the provided image transformation `options`.
 */
export async function validateImageTransformOptions(
  options: ImageTransformOptions,
): Promise<{ success: true } | { success: false; error: string }> {
  const { __ } = await import('#pruvious/server')

  if (isUndefined(options.format)) {
    return { success: false, error: __('pruvious-api', 'The `$param` parameter is required', { param: 'format' }) }
  } else if (options.format && !['webp', 'jpeg', 'png', 'avif', 'gif'].includes(options.format)) {
    return {
      success: false,
      error: __('pruvious-api', 'Invalid `$param` value. Must be one of: $values', {
        param: 'format',
        values: "'webp', 'jpeg', 'png', 'avif', 'gif'",
      }),
    }
  }

  if (isDefined(options.width) && options.width !== 'auto') {
    if (!isPositiveInteger(options.width)) {
      return {
        success: false,
        error: __('pruvious-api', "The `$param` parameter must be a positive integer or 'auto'", { param: 'width' }),
      }
    }
  }

  if (isDefined(options.height) && options.height !== 'auto') {
    if (!isPositiveInteger(options.height)) {
      return {
        success: false,
        error: __('pruvious-api', "The `$param` parameter must be a positive integer or 'auto'", { param: 'height' }),
      }
    }
  }

  if (isDefined(options.fit) && !['cover', 'contain'].includes(options.fit)) {
    return {
      success: false,
      error: __('pruvious-api', 'Invalid `$param` value. Must be one of: $values', {
        param: 'fit',
        values: "'cover', 'contain'",
      }),
    }
  }

  if (
    isDefined(options.quality) &&
    (!isPositiveInteger(options.quality) || options.quality < 0 || options.quality > 100)
  ) {
    return {
      success: false,
      error: __('pruvious-api', 'The `$param` parameter must be an integer between $min and $max', {
        param: 'quality',
        min: 0,
        max: 100,
      }),
    }
  }

  if (
    isDefined(options.position) &&
    !['center', 'top', 'topRight', 'right', 'bottomRight', 'bottom', 'bottomLeft', 'left', 'topLeft'].includes(
      options.position,
    )
  ) {
    return {
      success: false,
      error: __('pruvious-api', 'Invalid `$param` value. Must be one of: $values', {
        param: 'position',
        values: "'center', 'top', 'topRight', 'right', 'bottomRight', 'bottom', 'bottomLeft', 'left', 'topLeft'",
      }),
    }
  }

  if (isDefined(options.rotate) && ![0, 90, 180, 270].includes(options.rotate)) {
    return {
      success: false,
      error: __('pruvious-api', 'Invalid `$param` value. Must be one of: $values', {
        param: 'rotate',
        values: '0, 90, 180, 270',
      }),
    }
  }

  if (isDefined(options.blur) && (!isRealNumber(options.blur) || options.blur < 0 || options.blur > 1)) {
    return {
      success: false,
      error: __('pruvious-api', 'The `$param` parameter must be a number between $min and $max', {
        param: 'blur',
        min: 0,
        max: 1,
      }),
    }
  }

  if (isDefined(options.sharpen) && (!isRealNumber(options.sharpen) || options.sharpen < 0 || options.sharpen > 1)) {
    return {
      success: false,
      error: __('pruvious-api', 'The `$param` parameter must be a number between $min and $max', {
        param: 'sharpen',
        min: 0,
        max: 1,
      }),
    }
  }

  if (isDefined(options.brightness) && (!isRealNumber(options.brightness) || options.brightness < 0)) {
    return {
      success: false,
      error: __('pruvious-api', 'The `$param` parameter must be a positive number', { param: 'brightness' }),
    }
  }

  if (isDefined(options.preserveAnimation) && !isBoolean(options.preserveAnimation)) {
    return {
      success: false,
      error: __('pruvious-api', 'The `$param` parameter must be a boolean', { param: 'preserveAnimation' }),
    }
  }

  return { success: true }
}

/**
 * Optimize an image using the provided transformation `options`.
 *
 * Returns a `Result` object with a `success` property indicating whether the operation was successful.
 *
 * - If successful, the `image` property contains the optimized image as a `Buffer`.
 * - If unsuccessful, the `error` property contains the error message.
 *
 * @example
 * ```ts
 * await optimizeImage('/path/to/image.jpg', {
 *   format: 'webp',
 *   width: 320,
 *   height: 320,
 *   fit: 'contain',
 * })
 * ```
 */
export async function optimizeImage(
  imageURL: string,
  options: ImageVariantOptions,
): Promise<{ success: true; image: Buffer } | { success: false; error: string }> {
  const originalExtension = extname(imageURL)
  const validate = await validateImageTransformOptions({ ...options, originalExtension })
  const normalizedOptions = normalizeImageTransformOptions({ ...options, originalExtension })

  if (!validate.success) {
    return validate
  }

  try {
    if (isWorkerd) {
      if (imageURL.startsWith('/')) {
        try {
          const event = useEvent()
          const runtimeConfig = useRuntimeConfig()
          const { origin } = new URL(event.context.cloudflare.request.url)
          imageURL = origin + runtimeConfig.pruvious.uploads.basePath + imageURL.slice(1)
        } catch (error: any) {
          return { success: false, error: `Cannot resolve base URL from event context. ${error.message}` }
        }
      }

      imageURL += (imageURL.includes('?') ? '&' : '?') + `_nocache=${nanoid()}`

      const cf = {
        image: {
          format: normalizedOptions.format,
          width: normalizedOptions.width === 'auto' ? undefined : normalizedOptions.width,
          height: normalizedOptions.height === 'auto' ? undefined : normalizedOptions.height,
          fit: normalizedOptions.fit,
          quality: normalizedOptions.quality,
          gravity:
            normalizedOptions.position === 'top'
              ? { x: 0.5, y: 0 }
              : normalizedOptions.position === 'topRight'
                ? { x: 1, y: 0 }
                : normalizedOptions.position === 'right'
                  ? { x: 1, y: 0.5 }
                  : normalizedOptions.position === 'bottomRight'
                    ? { x: 1, y: 1 }
                    : normalizedOptions.position === 'bottom'
                      ? { x: 0.5, y: 1 }
                      : normalizedOptions.position === 'bottomLeft'
                        ? { x: 0, y: 1 }
                        : normalizedOptions.position === 'left'
                          ? { x: 0, y: 0.5 }
                          : normalizedOptions.position === 'topLeft'
                            ? { x: 0, y: 0 }
                            : { x: 0.5, y: 0.5 },
          rotate: normalizedOptions.rotate,
          blur: normalizedOptions.blur ? 1 + normalizedOptions.blur * 27.5 : undefined,
          sharpen: normalizedOptions.sharpen ? normalizedOptions.sharpen * 10 : undefined,
          brightness: normalizedOptions.brightness,
          anim: normalizedOptions.preserveAnimation,
        },
      }

      const optimizedImage = await $fetch<Blob>(imageURL, { cf } as any)
      return { success: true, image: Buffer.from(await optimizedImage.arrayBuffer()) }
    } else {
      const sharp = await import('sharp').then((m) => m.default)
      const { __, getFile } = await import('#pruvious/server')
      const image = imageURL.startsWith('/')
        ? await getFile(imageURL).then((r) => (r.success ? r.data.file : undefined))
        : await $fetch<Blob>(imageURL).then((res) => res.arrayBuffer())

      if (!image) {
        return { success: false, error: __('pruvious-api', 'Failed to fetch image') }
      }

      const optimizedImage = sharp(image, { animated: normalizedOptions.preserveAnimation })
      const width = normalizedOptions.width === 'auto' ? null : normalizedOptions.width
      const height = normalizedOptions.height === 'auto' ? null : normalizedOptions.height
      const position =
        normalizedOptions.position === 'center'
          ? 'centre'
          : normalizedOptions.position === 'topRight'
            ? 'right top'
            : normalizedOptions.position === 'bottomRight'
              ? 'right bottom'
              : normalizedOptions.position === 'bottomLeft'
                ? 'left bottom'
                : normalizedOptions.position === 'topLeft'
                  ? 'left top'
                  : normalizedOptions.position

      if (normalizedOptions.format === 'webp') {
        optimizedImage.webp({ quality: normalizedOptions.quality })
      } else if (normalizedOptions.format === 'jpeg') {
        optimizedImage.jpeg({ quality: normalizedOptions.quality })
      } else if (normalizedOptions.format === 'png') {
        optimizedImage.png({ quality: normalizedOptions.quality })
      } else if (normalizedOptions.format === 'avif') {
        optimizedImage.avif({ quality: normalizedOptions.quality })
      } else if (normalizedOptions.format === 'gif') {
        optimizedImage.gif()
      }

      optimizedImage.resize(width, height, {
        fit: normalizedOptions.fit === 'contain' ? 'inside' : 'cover',
        position: position,
      })

      if (normalizedOptions.rotate) {
        optimizedImage.rotate(normalizedOptions.rotate)
      }

      if (normalizedOptions.blur) {
        optimizedImage.blur({ sigma: 0.3 + normalizedOptions.blur * 25 })
      }

      if (normalizedOptions.sharpen) {
        optimizedImage.sharpen({ sigma: Math.max(0.000001, normalizedOptions.sharpen * 10) })
      }

      if (normalizedOptions.brightness) {
        optimizedImage.modulate({ brightness: normalizedOptions.brightness })
      }

      return { success: true, image: await optimizedImage.toBuffer() }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
