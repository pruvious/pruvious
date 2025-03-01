import {
  castToBoolean,
  castToNumber,
  defu,
  isBoolean,
  isDefined,
  isPositiveInteger,
  isRealNumber,
  isString,
  isUndefined,
} from '@pruvious/utils'
import { basename, extname } from 'pathe'
import { isWorkerd } from 'std-env'

export interface ImageTransformOptions {
  /**
   * The output format for the transformed image.
   *
   * - `webp` - Modern, efficient web image format with good compression and quality.
   * - `jpeg` - Standard lossy compression format, good for photographs.
   * - `png` - Lossless format supporting transparency, ideal for graphics.
   * - `avif` - Next-gen format with superior compression and quality.
   * - `gif` - Animated image format with basic color palette.
   */
  format: 'webp' | 'jpeg' | 'png' | 'avif' | 'gif'

  /**
   * Specifies the width of the image in pixels.
   * Set to `auto` to preserve aspect ratio when a `height` value exists.
   *
   * @default 'auto'
   */
  width?: number | 'auto'

  /**
   * Specifies the height of the image in pixels.
   * Set to `auto` to preserve aspect ratio when a `width` value exists.
   *
   * @default 'auto'
   */
  height?: number | 'auto'

  /**
   * Controls how the image is resized when both `width` and `height` values are provided.
   *
   * - `cover`   - Maintains aspect ratio and crops the image to fill exact dimensions.
   * - `contain` - Maintains original aspect ratio while fitting the image inside the target dimensions.
   *               No cropping occurs. If target dimensions have a different aspect ratio than the source image,
   *               the resulting image may have smaller dimensions than requested to avoid distortion.
   *
   * @default 'cover'
   */
  fit?: 'cover' | 'contain'

  /**
   * The quality of the image after compression (`0` is worst, `100` is best).
   * Only applies to `webp`, `jpeg`, `png`, and `avif` formats.
   *
   * @default 80
   */
  quality?: number

  /**
   * Defines the anchor point for the image during resize and crop operations.
   * This determines which part of the image remains visible when dimensions change.
   *
   * @default 'center'
   */
  position?: 'center' | 'top' | 'topRight' | 'right' | 'bottomRight' | 'bottom' | 'bottomLeft' | 'left' | 'topLeft'

  /**
   * Specifies the rotation angle for the image in degrees.
   * Only accepts values of 90, 180, or 270 degrees for clockwise rotation.
   *
   * @default 0
   */
  rotate?: number

  /**
   * Applies a Gaussian blur effect to the image.
   * Accepts values between `0` and `1`.
   * `0` represents no blur, `1` represents maximum blur.
   * Results may vary depending on the image transformation provider (Sharp or Cloudflare Images).
   *
   * @default 0
   */
  blur?: number

  /**
   * Specifies strength of sharpening filter to apply to the image.
   * Accepts values between `0` and `1`.
   * `0` represents no sharpening, `1` represents maximum sharpening.
   * Results may vary depending on the image transformation provider (Sharp or Cloudflare Images).
   *
   * @default 0
   */
  sharpen?: number

  /**
   * Adjusts the brightness level by applying a multiplication factor.
   * A factor of `1` maintains original brightness, `0.5` reduces to half brightness, and `2` doubles the brightness.
   * Results may vary depending on the image transformation provider (Sharp or Cloudflare Images).
   *
   * @default 1
   */
  brightness?: number

  /**
   * Preserves animation frames from source files.
   * Applicable for formats supporting animation like GIF and WebP.
   *
   * @default false
   */
  preserveAnimation?: boolean
}

/**
 * Encodes a prevalidated image transformation `options` object into a URL-safe string that can be used as a suffix for image URLs.
 *
 * @returns the encoded image transformation options as a string.
 *
 * @example
 * ```ts
 * stringifyImageTransformOptions({ format: 'webp', width: 320, height: 320, fit: 'contain' })
 * // '_w320_h320_contain.webp'
 * ```
 */
export function stringifyImageTransformOptions(options: ImageTransformOptions): string {
  const parts: string[] = []

  if (isRealNumber(options.width)) {
    parts.push(`w${options.width}`)
  }

  if (isRealNumber(options.height)) {
    parts.push(`h${options.height}`)
  }

  if (isString(options.fit) && options.fit !== 'cover') {
    parts.push(options.fit)
  }

  if (isRealNumber(options.quality) && options.quality !== 80) {
    parts.push(`q${options.quality}`)
  }

  if (isString(options.position) && options.position !== 'center') {
    parts.push(options.position)
  }

  if (isRealNumber(options.rotate) && options.rotate !== 0) {
    parts.push(`r${options.rotate}`)
  }

  if (isRealNumber(options.blur) && options.blur !== 0) {
    parts.push(`bl${options.blur}`)
  }

  if (isRealNumber(options.sharpen) && options.sharpen !== 0) {
    parts.push(`s${options.sharpen}`)
  }

  if (isRealNumber(options.brightness) && options.brightness !== 1) {
    parts.push(`br${options.brightness}`)
  }

  if (options.preserveAnimation) {
    parts.push('pa1')
  }

  return '_' + parts.join('_') + `.${options.format}`
}

/**
 * Decodes the provided image transformation `urlSuffix` into an `ImageTransformOptions` object.
 *
 * @returns the decoded image transformation options as an object.
 *
 * @example
 * ```ts
 * parseImageTransformOptions('_w320_h320_contain.webp')
 * // {
 * //   format: 'webp',
 * //   width: 320,
 * //   height: 320,
 * //   fit: 'contain',
 * //   quality: 80,
 * //   position: 'center',
 * //   rotate: 0,
 * //   blur: 0,
 * //   sharpen: 0,
 * //   brightness: 1,
 * //   preserveAnimation: false,
 * // }
 * ```
 */
export function parseImageTransformOptions(urlSuffix: string): Required<ImageTransformOptions> {
  const ext = extname(urlSuffix)
  const base = basename(urlSuffix, ext)
  const parts = base.split('_').filter(Boolean)
  const options: Record<string, any> = normalizeImageTransformOptions({ format: ext.slice(1) as any })

  for (const part of parts) {
    if (['cover', 'contain'].includes(part)) {
      options.fit = part
    } else if (
      ['center', 'top', 'topRight', 'right', 'bottomRight', 'bottom', 'bottomLeft', 'left', 'topLeft'].includes(part)
    ) {
      options.position = part
    } else if (part.startsWith('bl')) {
      options.blur = castToNumber(part.slice(2))
    } else if (part.startsWith('br')) {
      options.brightness = castToNumber(part.slice(2))
    } else if (part.startsWith('pa')) {
      options.preserveAnimation = castToBoolean(part.slice(2))
    } else if (part.startsWith('w')) {
      options.width = castToNumber(part.slice(1))
    } else if (part.startsWith('h')) {
      options.height = castToNumber(part.slice(1))
    } else if (part.startsWith('q')) {
      options.quality = castToNumber(part.slice(1))
    } else if (part.startsWith('r')) {
      options.rotate = castToNumber(part.slice(1))
    } else if (part.startsWith('s')) {
      options.sharpen = castToNumber(part.slice(1))
    }
  }

  return options as Required<ImageTransformOptions>
}

/**
 * Normalizes the provided image transformation `options` by filling in missing values with defaults.
 */
export function normalizeImageTransformOptions(options: ImageTransformOptions): Required<ImageTransformOptions> {
  return defu(options, {
    width: 'auto',
    height: 'auto',
    fit: 'cover',
    quality: 80,
    position: 'center',
    rotate: 0,
    blur: 0,
    sharpen: 0,
    brightness: 1,
    preserveAnimation: false,
  } as const)
}

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
  options: ImageTransformOptions,
): Promise<{ success: true; image: Buffer } | { success: false; error: string }> {
  const validate = await validateImageTransformOptions(options)
  const normalizedOptions = normalizeImageTransformOptions(options)

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

      imageURL += (imageURL.includes('?') ? '&' : '?') + `__nocache=${Date.now()}`

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

/**
 * Retrieves the optimized image path by appending the provided `urlSuffix` to the `uploadPath`.
 */
export function generateOptimizedImagePath(uploadPath: string, urlSuffix: string): string {
  const ext = extname(uploadPath)
  const basePath = ext ? uploadPath.slice(0, -ext.length) : uploadPath
  return basePath + urlSuffix
}
