import { primaryLanguage, type CastedFieldType, type SupportedLanguage } from '#pruvious'
import fs from 'fs-extra'
import { hash as _hash } from 'ohash'
import path from 'path'
import sharp from 'sharp'
import { db } from '../instances/database'
import { s3GetObject, s3PutObject } from '../instances/s3'
import { getModuleOption } from '../instances/state'
import { objectPick } from '../utils/object'
import { __ } from '../utils/server/translate-string'
import { joinRouteParts } from '../utils/string'
import { imageTypes } from '../utils/uploads'

interface BaseOptimizedImage {
  /**
   * The width of the image in pixels.
   * Use `null` or `undefined` to auto-scale the width to match the height.
   *
   * Defaults to the original image's width.
   */
  width?: number | null

  /**
   * The height of the image in pixels.
   * Use `null` or `undefined` to auto-scale the width to match the height.
   *
   * Defaults to the original image's height.
   */
  height?: number | null

  /**
   * The resizing mode to identify how an image should be resized.
   *
   * - `contain` - Preserving aspect ratio, contain within both provided dimensions using "letterboxing" where necessary.
   * - `cover` - Preserving aspect ratio, attempt to ensure the image covers both provided dimensions by cropping/clipping to fit.
   * - `fill` - Ignore the aspect ratio of the input and stretch to both provided dimensions.
   * - `inside` - Preserving aspect ratio, resize the image to be as large as possible while ensuring its dimensions are less than or equal to both those specified.
   * - `outside` - Preserving aspect ratio, resize the image to be as small as possible while ensuring its dimensions are greater than or equal to both those specified.
   *
   * @default 'cover'
   */
  resize?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside'

  /**
   * Do not scale up if the width or height are already less than the target dimensions.
   * This may result in output dimensions smaller than the target dimensions.
   *
   * @default false
   */
  withoutEnlargement?: boolean

  /**
   * Do not scale down if the width or height are already greater than the target dimensions.
   * This may still result in a crop to reach the target dimensions.
   *
   * @default false
   */
  withoutReduction?: boolean

  /**
   * The position for the image when resized and cropped.
   *
   * @default 'center'
   */
  position?: 'center' | 'top' | 'topRight' | 'right' | 'bottomRight' | 'bottom' | 'bottomLeft' | 'left' | 'topLeft'

  /**
   * The interpolation algorithm used in resizing.
   *
   * @default 'lanczos3'
   */
  interpolation?: 'cubic' | 'lanczos2' | 'lanczos3' | 'mitchell' | 'nearest'
}

interface JpegOptimizedImage extends BaseOptimizedImage {
  /**
   * Image format - jpeg, png, or webp.
   */
  format: 'jpeg'

  /**
   * The quality of the image after compression (0 is worst, 100 is best).
   * Only applies to `jpeg` and `webp`.
   *
   * @default 80
   */
  quality?: number
}

interface PngOptimizedImage extends BaseOptimizedImage {
  /**
   * Image format - jpeg, png, or webp.
   */
  format: 'png'
}

interface WebpOptimizedImage extends BaseOptimizedImage {
  /**
   * Image format - jpeg, png, or webp.
   */
  format: 'webp'

  /**
   * The quality of the image after compression (0 is worst, 100 is best).
   * Only applies to `jpeg` and `webp`.
   *
   * @default 80
   */
  quality?: number

  /**
   * The quality of the image's alpha layer after compression.
   * Only applies to `webp`.
   *
   * @default 100
   */
  alphaQuality?: number

  /**
   * If true, the image is compressed without any degradation in quality.
   * Only applicable for `webp` image format.
   *
   * @default false
   */
  lossless?: boolean

  /**
   * If true, the image is compressed in a manner between total lossy and lossless.
   * Only applies to `webp`.
   *
   * @default false
   */
  nearLossless?: boolean

  /**
   * If true, apply subsampling to improve image size reduction.
   * Only applies to `webp`.
   *
   * @default false
   */
  smartSubsample?: boolean
}

export type OptimizedImage = JpegOptimizedImage | PngOptimizedImage | WebpOptimizedImage

export type ImageSource = OptimizedImage & {
  /**
   * The media query of the image source or `null` if not specified.
   *
   * @example '(max-width: 768px)'
   */
  media?: string | null
}

export interface OptimizedImageSource {
  /**
   * The URL or absolute path of the image source.
   */
  srcset: string

  /**
   * The width of the image source in pixels.
   */
  width: number

  /**
   * The height of the image source in pixels.
   */
  height: number

  /**
   * The MIME type of the image source.
   */
  type: string

  /**
   * The media query of the image source or `null` if not specified.
   */
  media: string | null
}

export interface Image {
  /**
   * The URL or absolute path to the optimized image.
   */
  src: string

  /**
   * The alternative text of the image.
   */
  alt: string

  /**
   * The width of the image in pixels.
   */
  width: number

  /**
   * The height of the image in pixels.
   */
  height: number

  /**
   * The MIME type of the image.
   */
  type: string

  /**
   * An array of optimized image sources.
   */
  sources: OptimizedImageSource[]
}

/**
 * Optimize an image `upload` with the given `options`.
 *
 * Returns `null` if the `upload` is not an image.
 * Otherwise, returns an object with the following properties:
 *
 * - `success` - Whether the image was successfully optimized.
 * - `src` - The URL or absolute path to the optimized image.
 *
 * @example
 * ```typescript
 * // Convert an image to webp format with 92% quality
 * const upload = await query('uploads').select({ id: true, directory: true, filename: true, type: true }).first()
 * const optimizedImage = await getOptimizedImage(upload, { format: 'webp', quality: 92 })
 * // Output: { success: true, src: '/uploads/foo/bar/test_1234567890.webp' }
 * ```
 */
export async function getOptimizedImage(
  upload: Pick<CastedFieldType['uploads'], 'id' | 'directory' | 'filename' | 'type'>,
  options: OptimizedImage,
  contextLanguage?: SupportedLanguage,
): Promise<
  | {
      /**
       * Whether the image was successfully optimized.
       */
      success: true

      /**
       * The URL or absolute path to the optimized image.
       */
      src: string

      /**
       * The width of the optimized image.
       */
      width: number

      /**
       * The height of the optimized image.
       */
      height: number
    }
  | {
      /**
       * The error that occurred during optimization.
       */
      success: false

      /**
       * The error that occurred during optimization.
       */
      error: string
    }
> {
  if (!imageTypes.includes(upload.type)) {
    return {
      success: false,
      error: __(contextLanguage ?? primaryLanguage, 'pruvious-server', 'The upload is not an image'),
    }
  }

  const resolvedOptions: Required<OptimizedImage> =
    options.format === 'jpeg'
      ? { quality: options.quality ?? 80 }
      : options.format === 'webp'
      ? {
          quality: options.quality ?? 80,
          alphaQuality: options.alphaQuality ?? 100,
          lossless: options.lossless ?? false,
          nearLossless: options.nearLossless ?? false,
          smartSubsample: options.smartSubsample ?? false,
        }
      : ({} as any)

  resolvedOptions.format = options.format
  resolvedOptions.width = options.width ?? null
  resolvedOptions.height = options.height ?? null
  resolvedOptions.resize = options.resize ?? 'cover'
  resolvedOptions.withoutEnlargement = options.withoutEnlargement ?? false
  resolvedOptions.withoutReduction = options.withoutReduction ?? false
  resolvedOptions.position = options.position ?? 'center'
  resolvedOptions.interpolation = options.interpolation ?? 'lanczos3'

  const uploadsOptions = getModuleOption('uploads')
  const hash = _hash(resolvedOptions)
  const image: any = await (await db()).model('_optimized_images').findOne({ where: { upload_id: upload.id, hash } })
  const paths = generateImagePaths(upload.directory, upload.filename, hash, options.format)
  let width: number = image?.width ?? resolvedOptions.width
  let height: number = image?.height ?? resolvedOptions.height

  if (!image) {
    try {
      const uploadsDir = path.resolve(getModuleOption('uploadsDir'))
      const original =
        uploadsOptions.drive.type === 'local'
          ? fs.readFileSync(path.resolve(joinRouteParts(uploadsDir, upload.directory, upload.filename)))
          : await s3GetObject(joinRouteParts(upload.directory, upload.filename))
      const sharpImage = sharp(original)

      if (resolvedOptions.format === 'png') {
        sharpImage.png()
      } else if (resolvedOptions.format === 'webp') {
        sharpImage.webp(
          objectPick(resolvedOptions, ['quality', 'alphaQuality', 'lossless', 'nearLossless', 'smartSubsample']),
        )
      } else {
        sharpImage.jpeg(objectPick(resolvedOptions, ['quality']))
      }

      sharpImage.resize({
        width: resolvedOptions.width ?? undefined,
        height: resolvedOptions.height ?? undefined,
        fit: resolvedOptions.resize,
        withoutEnlargement: resolvedOptions.withoutEnlargement,
        withoutReduction: resolvedOptions.withoutReduction,
        position:
          resolvedOptions.position === 'center'
            ? 'centre'
            : resolvedOptions.position === 'topRight'
            ? 'right top'
            : resolvedOptions.position === 'bottomRight'
            ? 'right bottom'
            : resolvedOptions.position === 'bottomLeft'
            ? 'left bottom'
            : resolvedOptions.position === 'topLeft'
            ? 'left top'
            : resolvedOptions.position,
        kernel: resolvedOptions.interpolation,
      })

      const imageBuffer = await sharpImage.toBuffer({ resolveWithObject: true })
      width = imageBuffer.info.width
      height = imageBuffer.info.height

      if (uploadsOptions.drive.type === 'local') {
        fs.writeFileSync(path.resolve(paths.drive), imageBuffer.data)
      } else {
        await s3PutObject(
          paths.drive,
          imageBuffer.data,
          resolvedOptions.format === 'jpeg'
            ? 'image/jpeg'
            : resolvedOptions.format === 'webp'
            ? 'image/webp'
            : 'image/png',
        )
      }
      await (await db())
        .model('_optimized_images')
        .create({ upload_id: upload.id, hash, ...resolvedOptions, width, height })
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  return { success: true, src: paths.public, width, height }
}

export function generateImagePaths(
  directory: string,
  filename: string,
  hash: string,
  format: OptimizedImage['format'],
): { filename: string; drive: string; public: string } {
  const options = getModuleOption('uploads')
  const uploadsDir = path.resolve(getModuleOption('uploadsDir'))
  const basename = filename.includes('.') ? filename.split('.').slice(0, -1).join('.') : filename
  const extension = format === 'jpeg' ? 'jpg' : format === 'webp' ? 'webp' : 'png'
  const imageFilename = `${basename}_${hash}.${extension}`

  return options.drive.type === 'local'
    ? {
        filename: imageFilename,
        drive: joinRouteParts(uploadsDir, directory, imageFilename),
        public: joinRouteParts(
          getModuleOption('baseUrl'),
          options.drive.urlPrefix ?? 'uploads',
          directory,
          imageFilename,
        ),
      }
    : {
        filename: imageFilename,
        drive: joinRouteParts(directory, imageFilename),
        public: options.drive.baseUrl + directory + imageFilename,
      }
}
