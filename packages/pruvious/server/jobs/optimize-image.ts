import {
  defineJob,
  deregisterOptimizedImage,
  generateOptimizedImagePath,
  optimizeImage,
  putFile,
  registerOptimizedImage,
  stringifyImageTransformOptions,
  type ImageTransformOptions,
} from '#pruvious/server'

export default defineJob({
  retry: { count: 5, delay: 1000 },
  handler: async ({
    uploadId,
    options,
    baseURL,
  }: {
    uploadId: number
    options: ImageTransformOptions
    baseURL?: string
  }) => {
    const urlSuffix = stringifyImageTransformOptions(options)
    const registration = await registerOptimizedImage(uploadId, urlSuffix)

    if (!registration.success) {
      throw new Error(registration.error)
    }

    const optimizeResult = await optimizeImage((baseURL ?? '') + registration.upload.path, options)

    if (!optimizeResult.success) {
      await deregisterOptimizedImage(uploadId, urlSuffix)
      throw new Error(optimizeResult.error)
    }

    const imagePath = generateOptimizedImagePath(registration.upload.path, urlSuffix)
    const putResult = await putFile(optimizeResult.image, imagePath)

    if (!putResult.success) {
      await deregisterOptimizedImage(uploadId, urlSuffix)
      throw new Error(putResult.error)
    }

    return putResult
  },
})
