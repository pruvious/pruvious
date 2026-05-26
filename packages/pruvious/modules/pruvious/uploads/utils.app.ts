import { isUndefined } from '@pruvious/utils'
import { extname, join } from 'pathe'
import { stringifyImageTransformOptions, type ImageVariantOptions } from './images.shared'
import { optimizableImageTypes } from './utils.shared'

/**
 * Resolves the full URL `path` of an upload based on its relative path in the media library.
 *
 * @example
 * ```ts
 * const url = resolveUploadPath('/images/photo.jpg')
 * //=> '/uploads/images/photo.jpg'
 * ```
 */
export function resolveUploadPath(path: string): string {
  const runtimeConfig = useRuntimeConfig()
  return join(runtimeConfig.app.baseURL, runtimeConfig.public.pruvious.uploadsBasePath, path)
}

/**
 * Resolves the thumbnail URL path for a given image `upload`.
 * If the image is smaller than or equal to 320x320 pixels, it returns the original image URL.
 * Otherwise, it constructs and returns the URL for a 320x320 pixel thumbnail version of the image.
 *
 * @example
 * ```ts
 * const thumbnailUrl = resolveThumbnailPath({
 *   imageWidth: 800,
 *   imageHeight: 600,
 *   path: '/images/photo.jpg',
 * })
 * //=> '/uploads/images/photo_oextjpg_w320_h320_contain.webp'
 * ```
 */
export function resolveThumbnailPath(upload: { imageWidth: number; imageHeight: number; path: string }): string {
  if (upload.imageWidth <= 320 && upload.imageHeight <= 320) {
    return resolveUploadPath(upload.path)
  }
  const ext = extname(upload.path)
  const oext = ext ? '_oext' + extname(upload.path).slice(1) : ''
  return resolveUploadPath(upload.path.slice(0, -ext.length) + oext + '_w320_h320_contain.webp')
}

/**
 * Resolves the full URL of a transformed image variant for the given `upload`.
 * Falls back to the original upload URL when the upload's MIME type is not
 * optimizable (e.g. icons, BMP) so consumers can render any image without
 * additional checks.
 *
 * @example
 * ```ts
 * resolveImageVariantPath(
 *   { path: '/photos/sunset.jpg', mime: 'image/jpeg' },
 *   { format: 'webp', width: 320, height: 320, fit: 'contain' },
 * )
 * //=> '/uploads/photos/sunset_oextjpg_w320_h320_contain.webp'
 * ```
 */
export function resolveImageVariantPath(upload: { path: string; mime: string }, options: ImageVariantOptions): string {
  if (isUndefined(optimizableImageTypes[upload.mime])) {
    return resolveUploadPath(upload.path)
  }
  const originalExtension = extname(upload.path)
  const base = originalExtension ? upload.path.slice(0, -originalExtension.length) : upload.path
  return resolveUploadPath(base + stringifyImageTransformOptions({ ...options, originalExtension }))
}
