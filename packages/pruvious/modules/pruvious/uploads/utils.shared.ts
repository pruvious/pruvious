import type { MediaCategory } from './utils.server'

export type OptimizableImageType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'image/svg+xml'
  | 'image/avif'

/**
 * Media categories for the `Uploads` collection.
 * The keys are the category names and the values are the MIME types that belong to that category.
 */
export const mediaCategories = {
  'document': [
    // PDF
    'application/pdf',
    'application/x-pdf',
    'application/acrobat',

    // Microsoft Office - Legacy
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',

    // Microsoft Office - Modern
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
    'application/vnd.openxmlformats-officedocument.presentationml.template',

    // OpenOffice/LibreOffice
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.oasis.opendocument.graphics',
    'application/vnd.oasis.opendocument.chart',

    // Rich Text
    'application/rtf',
    'application/x-rtf',
    'text/richtext',
  ] as const,

  'image': [
    // Common web formats
    'image/jpeg',
    'image/pjpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/avif',
    'image/heif',
    'image/heic',
    'image/jxl', // JPEG XL
    'image/vnd.mozilla.apng', // Animated PNG

    // Icon formats
    'image/x-icon',
    'image/vnd.microsoft.icon',

    // Professional formats
    'image/tiff',
    'image/x-tiff',
    'image/bmp',
    'image/x-windows-bmp',
    'image/jp2', // JPEG 2000
    'image/jpx',
    'image/jpm',
    'image/jxs', // JPEG XS
    'image/x-xcf', // GIMP

    // Raw camera formats
    'image/x-canon-cr2',
    'image/x-canon-cr3',
    'image/x-nikon-nef',
    'image/x-sony-arw',
    'image/x-adobe-dng',
    'image/x-olympus-orf',
    'image/x-fuji-raf',
    'image/x-panasonic-rw2',
    'image/x-pentax-pef',
    'image/x-samsung-srw',
    'image/x-sigma-x3f',
    'image/x-hasselblad-3fr',
    'image/x-phaseone-iiq',

    // HDR formats
    'image/vnd.radiance',
    'image/x-exr',
    'image/x-hdr',

    // Design formats
    'image/vnd.adobe.photoshop',
    'application/x-photoshop',
    'image/x-photoshop',
    'application/photoshop',
    'application/psd',
    'image/psd',
    'application/illustrator',
    'application/postscript',

    // Scientific/Medical formats
    'image/x-dicom',
    'image/fits',

    // Texture formats
    'image/ktx',
    'image/ktx2',
    'image/vnd.dds',
    'image/x-dds',

    // Specialized web formats
    'image/jxr', // JPEG XR
    'image/x-icns', // Apple Icon format
    'image/x-tga',
    'image/vnd.dwg',
    'image/x-portable-pixmap',
    'image/x-portable-graymap',
    'image/x-portable-bitmap',
    'image/x-portable-anymap',
  ] as const,

  'audio': [
    // Common formats
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/aac',
    'audio/aacp',
    'audio/ogg',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/x-pn-wav',
    'audio/webm',
    'audio/flac',

    // Professional formats
    'audio/aiff',
    'audio/x-aiff',
    'audio/basic',
    'audio/midi',
    'audio/x-midi',
    'audio/mpegurl',
    'audio/x-mpegurl',
    'audio/x-ms-wma',
    'audio/x-ms-wax',

    // Streaming formats
    'audio/vnd.wav',
    'audio/x-m4a',
    'audio/mp4a-latm',
    'audio/x-matroska',
  ] as const,

  'video': [
    // Common formats
    'video/mp4',
    'video/mpeg',
    'video/ogg',
    'video/webm',
    'video/3gpp',
    'video/3gpp2',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/x-flv',

    // Professional formats
    'video/quicktime',
    'video/x-quicktime',
    'video/x-m4v',
    'video/x-matroska',
    'video/x-ms-asf',
    'video/x-ms-wmx',
    'video/x-ms-wvx',

    // Streaming formats
    'application/x-mpegURL',
    'video/MP2T',
    'application/vnd.apple.mpegurl',
    'application/vnd.rn-realmedia',
    'application/vnd.rn-realmedia-vbr',
  ] as const,

  'archive': [
    // Common formats
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-gzip',
    'application/x-tar',
    'application/x-bzip',
    'application/x-bzip2',

    // Disk images
    'application/x-iso9660-image',
    'application/x-apple-diskimage',

    // Other archives
    'application/vnd.rar',
    'application/x-stuffit',
    'application/x-ace-compressed',
    'application/x-archive',
    'application/x-cpio',
    'application/x-shar',
    'application/x-lzh-compressed',
    'application/x-lzip',
    'application/x-lzma',
    'application/x-xz',
    'application/x-compress',
    'application/x-compressed',
  ] as const,

  'code': [
    // Web
    'text/html',
    'application/xhtml+xml',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/x-javascript',
    'application/ecmascript',
    'application/x-httpd-php',
    'application/x-php',
    'application/php',

    // Programming languages
    'text/x-python',
    'text/x-java-source',
    'text/x-c',
    'text/x-c++',
    'text/x-csharp',
    'text/x-ruby',
    'text/x-perl',
    'text/x-go',
    'text/x-rust',
    'text/x-swift',
  ] as const,

  'font': [
    // Modern web fonts
    'font/woff',
    'font/woff2',
    'font/ttf',
    'font/otf',
    'font/collection',

    // Legacy font types
    'application/x-font-ttf',
    'application/x-font-otf',
    'application/x-font-woff',
    'application/font-woff',
    'application/font-woff2',
    'application/vnd.ms-fontobject',
    'application/font-sfnt',
    'application/x-font-opentype',
    'application/x-font-truetype',
  ] as const,

  '3d': [
    // Common 3D formats
    'model/3mf',
    'model/stl',
    'application/sla',
    'model/obj',
    'model/gltf-binary',
    'model/gltf+json',
    'model/vnd.collada+xml',

    // CAD formats
    'application/x-3ds',
    'application/x-blend',
    'application/x-sketchup',
    'application/acad',
    'application/x-dwg',
    'application/x-dxf',
    'application/vnd.autodesk.inventor.part',
  ] as const,

  'data': [
    // Structured data
    'application/json',
    'application/ld+json',
    'application/xml',
    'text/xml',
    'text/csv',
    'text/tab-separated-values',
    'application/x-yaml',
    'text/yaml',

    // Database files
    'application/sql',
    'application/x-sql',
    'application/vnd.sqlite3',
    'application/x-sqlite3',
    'application/x-mysql-dump',
    'application/x-postgresql-dump',
    'application/graphql',
    'application/x-mongodb',
    'application/vnd.apache.parquet',
    'application/x-avro-binary',
    'application/vnd.ms-access',
    'application/x-msaccess',
    'application/vnd.oracle',
    'application/x-dbase',
  ] as const,

  'system': [
    // Configuration
    'application/x-conf',
    'application/x-ini',
    'application/toml',

    // System files
    'application/x-executable',
    'application/x-sharedlib',
    'application/x-shellscript',
    'application/batch-file',
    'application/x-ms-dos-executable',
    'application/x-msdownload',

    // Certificate/Key files
    'application/x-x509-ca-cert',
    'application/x-pkcs12',
    'application/pgp-keys',
    'application/x-pem-file',

    // Logs
    'application/x-log',
    'text/x-log',
  ] as const,

  'text': [
    // Plain text formats
    'text/plain',
    'text/markdown',
    'text/calendar',
  ] as const,

  'other': [] as const,
} satisfies Record<MediaCategory, readonly string[]>

export const displayableImageTypes: Record<string, true> = {
  'image/jpeg': true,
  'image/pjpeg': true,
  'image/png': true,
  'image/gif': true,
  'image/webp': true,
  'image/svg+xml': true,
  'image/avif': true,
  'image/vnd.mozilla.apng': true,
  'image/x-icon': true,
  'image/vnd.microsoft.icon': true,
  'image/bmp': true,
  'image/x-windows-bmp': true,
}

export const optimizableImageTypes: Record<string, true> = {
  'image/jpeg': true,
  'image/png': true,
  'image/gif': true,
  'image/webp': true,
  'image/svg+xml': true,
  'image/avif': true,
}

export const playableVideoTypes: Record<string, true> = {
  'video/mp4': true,
  'video/webm': true,
  'video/ogg': true,
}
