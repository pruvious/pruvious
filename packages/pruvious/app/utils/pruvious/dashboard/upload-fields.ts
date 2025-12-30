import { __, type UploadItem } from '#pruvious/client'
import { formatBytes } from '@pruvious/utils'

export interface UploadFieldValidation {
  allowedMimes?: string[]
  minBytes?: number
  maxBytes?: number
  minImageWidth?: number
  maxImageWidth?: number
  minImageHeight?: number
  maxImageHeight?: number
}

export function validateUpload(
  upload: UploadItem,
  validation?: UploadFieldValidation,
): { value: false } | { value: true; reason: string } {
  if (validation?.allowedMimes && !validation.allowedMimes.includes(upload.mime)) {
    return { value: true, reason: __('pruvious-dashboard', 'File type not allowed') }
  }

  if (validation?.minBytes && upload.size < validation.minBytes) {
    return {
      value: true,
      reason: __('pruvious-dashboard', 'File too small.<br>Minimum size: `$minSize`<br>Current: `$currentSize`', {
        minSize: formatBytes(validation.minBytes)!,
        currentSize: formatBytes(upload.size)!,
      }),
    }
  }

  if (validation?.maxBytes && upload.size > validation.maxBytes) {
    return {
      value: true,
      reason: __('pruvious-dashboard', 'File too large.<br>Maximum size: `$maxSize`<br>Current: `$currentSize`', {
        maxSize: formatBytes(validation.maxBytes)!,
        currentSize: formatBytes(upload.size)!,
      }),
    }
  }

  if (validation?.minImageWidth && upload.imageWidth < validation.minImageWidth) {
    return {
      value: true,
      reason: __('pruvious-dashboard', 'Image width too small.<br>Minimum: `$minWidth` px<br>Current: `$width` px', {
        minWidth: validation.minImageWidth,
        width: upload.imageWidth,
      }),
    }
  }

  if (validation?.maxImageWidth && upload.imageWidth > validation.maxImageWidth) {
    return {
      value: true,
      reason: __('pruvious-dashboard', 'Image width too large.<br>Maximum: `$maxWidth` px<br>Current: `$width` px', {
        maxWidth: validation.maxImageWidth,
        width: upload.imageWidth,
      }),
    }
  }

  if (validation?.minImageHeight && upload.imageHeight < validation.minImageHeight) {
    return {
      value: true,
      reason: __('pruvious-dashboard', 'Image height too small.<br>Minimum: `$minHeight` px<br>Current: `$height` px', {
        minHeight: validation.minImageHeight,
        height: upload.imageHeight,
      }),
    }
  }

  if (validation?.maxImageHeight && upload.imageHeight > validation.maxImageHeight) {
    return {
      value: true,
      reason: __('pruvious-dashboard', 'Image height too large.<br>Maximum: `$maxHeight` px<br>Current: `$height` px', {
        maxHeight: validation.maxImageHeight,
        height: upload.imageHeight,
      }),
    }
  }

  return { value: false }
}
