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
      reason: __('pruvious-dashboard', 'Image width too small.<br>Minimum: `$minWidth`<br>Current: `$width`', {
        minWidth: `${validation.minImageWidth}px`,
        width: `${upload.imageWidth}px`,
      }),
    }
  }

  if (validation?.maxImageWidth && upload.imageWidth > validation.maxImageWidth) {
    return {
      value: true,
      reason: __('pruvious-dashboard', 'Image width too large.<br>Maximum: `$maxWidth`<br>Current: `$width`', {
        maxWidth: `${validation.maxImageWidth}px`,
        width: `${upload.imageWidth}px`,
      }),
    }
  }

  if (validation?.minImageHeight && upload.imageHeight < validation.minImageHeight) {
    return {
      value: true,
      reason: __('pruvious-dashboard', 'Image height too small.<br>Minimum: `$minHeight`<br>Current: `$height`', {
        minHeight: `${validation.minImageHeight}px`,
        height: `${upload.imageHeight}px`,
      }),
    }
  }

  if (validation?.maxImageHeight && upload.imageHeight > validation.maxImageHeight) {
    return {
      value: true,
      reason: __('pruvious-dashboard', 'Image height too large.<br>Maximum: `$maxHeight`<br>Current: `$height`', {
        maxHeight: `${validation.maxImageHeight}px`,
        height: `${upload.imageHeight}px`,
      }),
    }
  }

  return { value: false }
}
