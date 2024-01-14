import type { useRuntimeConfig } from '#imports'
import { joinRouteParts } from './string'

export const imageTypes = [
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
  'image/gif',
  'image/apng',
  'image/avif',
  'image/bmp',
  'image/heic',
  'image/tiff',
  'image/x-icon',
]

/**
 * Get the public URL of an uploaded file.
 * When using the local drive, the URL will be an absolute path.
 */
export function getPublicFilePath(
  upload: { directory: string; filename: string },
  runtimeConfig: ReturnType<typeof useRuntimeConfig>,
) {
  return runtimeConfig.public.pruvious.uploadsBase + upload.directory + upload.filename
}

/**
 * Parse the upload directory name from a string.
 *
 * @example
 * ```typescript
 * parseMediaDirectoryName('/')   // ''
 * parseMediaDirectoryName('foo') // foo/'
 * ```
 */
export function parseMediaDirectoryName(value: string) {
  let directory = joinRouteParts(value).toLowerCase().slice(1) + '/'
  return directory === '/' ? '' : directory
}
