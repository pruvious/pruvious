import {
  castToBoolean,
  castToNumber,
  defu,
  isNotNull,
  isNull,
  isPositiveInteger,
  isRealNumber,
  isString,
} from '@pruvious/utils'
import { basename, extname } from 'pathe'

export interface ImageVariantOptions {
  /**
   * The output format for the transformed image.
   *
   * - `'webp'` - Modern, efficient web image format with good compression and quality.
   * - `'jpeg'` - Standard lossy compression format, good for photographs.
   * - `'png'` - Lossless format supporting transparency, ideal for graphics.
   * - `'avif'` - Next-gen format with superior compression and quality.
   * - `'gif'` - Animated image format with basic color palette.
   */
  format: 'webp' | 'jpeg' | 'png' | 'avif' | 'gif'

  /**
   * Specifies the width of the image in pixels.
   * Set to `'auto'` to preserve aspect ratio when a `height` value exists.
   *
   * @default 'auto'
   */
  width?: number | 'auto'

  /**
   * Specifies the height of the image in pixels.
   * Set to `'auto'` to preserve aspect ratio when a `width` value exists.
   *
   * @default 'auto'
   */
  height?: number | 'auto'

  /**
   * Controls how the image is resized when both `width` and `height` values are provided.
   *
   * - `'cover'`   - Maintains aspect ratio and crops the image to fill exact dimensions.
   * - `'contain'` - Maintains original aspect ratio while fitting the image inside the target dimensions.
   *               No cropping occurs. If target dimensions have a different aspect ratio than the source image,
   *               the resulting image may have smaller dimensions than requested to avoid distortion.
   *
   * @default 'cover'
   */
  fit?: 'cover' | 'contain'

  /**
   * The quality of the image after compression (`0` is worst, `100` is best).
   * Only applies to `'webp'`, `'jpeg'`, `'png'`, and `'avif'` formats.
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

export interface ImageTransformOptions extends ImageVariantOptions {
  /**
   * The file extension of the original image, including the dot (e.g., `.jpg`).
   * Used to properly reference the source image during transformation.
   * This is an empty string if the original file has no extension.
   */
  originalExtension: string
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

  if (options.originalExtension !== '') {
    parts.push(`oext${options.originalExtension.slice(1)}`)
  }

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
 * parseImageTransformOptions('_oextjpg_w320_h320_contain.webp')
 * // {
 * //   format: 'webp',
 * //   originalExtension: '.jpg',
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
  const options: Record<string, any> = normalizeImageTransformOptions({
    format: ext.slice(1) as any,
    originalExtension: '',
  })

  for (const part of parts) {
    if (['cover', 'contain'].includes(part)) {
      options.fit = part
    } else if (
      ['center', 'top', 'topRight', 'right', 'bottomRight', 'bottom', 'bottomLeft', 'left', 'topLeft'].includes(part)
    ) {
      options.position = part
    } else if (part.startsWith('oext') && part.length > 4) {
      options.originalExtension = '.' + part.slice(4)
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
 * Fills in any missing fields on the provided `ImageVariantOptions` with their
 * defaults, returning a fully-populated `Required<ImageVariantOptions>`.
 *
 * Use this when passing user-supplied inline variant options to APIs typed as
 * `Required<ImageVariantOptions>` (such as `imageVariants` lookup results).
 */
export function normalizeImageVariantOptions(options: ImageVariantOptions): Required<ImageVariantOptions> {
  return {
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
    ...options,
  }
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
 * Computes the final rendered pixel dimensions of an image after applying the
 * given variant `options` to a source image with the provided original dimensions.
 *
 * The calculation mirrors the actual transformation pipeline: the image is
 * resized against the un-rotated source first, then rotated. A `rotate` of
 * `90` or `270` therefore swaps the *visible* output axes - the resize box
 * itself is consumed in source orientation.
 *
 * The calculation accounts for:
 *
 * - `fit: 'contain'` (scales the image to fit inside the box while preserving aspect ratio).
 * - `fit: 'cover'` (scales the image to fill the box; output matches the target dimensions).
 * - `'auto'` width or height (preserves the source aspect ratio against the other axis).
 * - `rotate` of `90` or `270` (swaps the resulting visible width and height).
 *
 * Both Sharp's `fit: 'inside'` and Cloudflare Images' `fit: 'contain'` enlarge the
 * source to fill the box by default, so the returned dimensions match the actual
 * rendered output in either engine.
 *
 * When source `width`/`height` are missing (e.g. for SVGs without intrinsic size),
 * the function returns the requested target dimensions with `0` for any axis that
 * could not be derived.
 *
 * @example
 * ```ts
 * resolveImageVariantDimensions(
 *   { width: 1600, height: 900 },
 *   { width: 320, height: 320, fit: 'contain' },
 * )
 * //=> { width: 320, height: 180 }
 * ```
 */
export function resolveImageVariantDimensions(
  source: { width: number; height: number },
  options: Pick<ImageVariantOptions, 'width' | 'height' | 'fit' | 'rotate'>,
): { width: number; height: number } {
  const sourceW = source.width
  const sourceH = source.height
  const targetW = isPositiveInteger(options.width) ? options.width : null
  const targetH = isPositiveInteger(options.height) ? options.height : null
  const rotated = options.rotate === 90 || options.rotate === 270

  let width: number
  let height: number

  if (!isPositiveInteger(sourceW) || !isPositiveInteger(sourceH)) {
    width = targetW ?? 0
    height = targetH ?? 0
  } else if (isNull(targetW) && isNull(targetH)) {
    width = sourceW
    height = sourceH
  } else if ((options.fit ?? 'cover') === 'cover') {
    if (isNotNull(targetW) && isNotNull(targetH)) {
      width = targetW
      height = targetH
    } else if (isNotNull(targetW)) {
      width = targetW
      height = Math.round((targetW / sourceW) * sourceH)
    } else {
      width = Math.round((targetH! / sourceH) * sourceW)
      height = targetH!
    }
  } else if (isNotNull(targetW) && isNotNull(targetH)) {
    const scale = Math.min(targetW / sourceW, targetH / sourceH)
    width = Math.round(sourceW * scale)
    height = Math.round(sourceH * scale)
  } else if (isNotNull(targetW)) {
    width = targetW
    height = Math.round((targetW / sourceW) * sourceH)
  } else {
    width = Math.round((targetH! / sourceH) * sourceW)
    height = targetH!
  }

  return rotated ? { width: height, height: width } : { width, height }
}

/**
 * Generates an optimized image path by appending the provided `urlSuffix` to the `uploadPath`.
 */
export function generateOptimizedImagePath(uploadPath: string, urlSuffix: string): string {
  const ext = extname(uploadPath)
  const basePath = ext ? uploadPath.slice(0, -ext.length) : uploadPath
  return basePath + urlSuffix
}

/**
 * Normalizes the path suffix for optimized images by sorting and removing duplicates from the transformations in the path.
 *
 * @example
 * ```ts
 * normalizeOptimizedImagePath('/images/photo_h300_w200_contain_q80_oextjpg.webp')
 * // '/images/photo_oextjpg_w200_h300_contain_q80.webp'
 * ```
 */
export function normalizeOptimizedImagePath(uploadPath: string): string {
  const urlSuffix = uploadPath.includes('_') ? '_' + uploadPath.split('_').slice(1).join('_') : ''
  return urlSuffix ? stringifyImageTransformOptions(parseImageTransformOptions(urlSuffix)) : uploadPath
}
