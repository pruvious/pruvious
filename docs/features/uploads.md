# Uploads

Pruvious ships a complete media library: a typed `Uploads` collection, pluggable storage drivers, multipart uploads for large files, on-demand image optimization, and Vue components that render the right variant for the right viewport.

This page covers the whole pipeline - from configuring storage to rendering an optimized `<picture>`.

## Storage drivers

Files are written through a single storage abstraction. The driver is set via a connection string in `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  extends: ['pruvious'],
  pruvious: {
    uploads: {
      driver: 'fs://.uploads',
    },
  },
})
```

Three drivers are supported out of the box:

| Driver | Connection string | Notes |
| --- | --- | --- |
| Local filesystem | `fs://path/to/uploads` | Path is relative to the current working directory. |
| Cloudflare R2 | `r2://BINDING` | `BINDING` is the R2 binding name from `wrangler.toml`. |
| S3-compatible | `s3://KEY:SECRET@host/bucket?region=...&ssl=true` | Works with AWS S3, DigitalOcean Spaces, MinIO, and others. |

Examples for the S3 family:

```ts
// AWS
's3://AKIAXXXXXXXX:SECRET_KEY@s3.amazonaws.com/my-bucket?region=us-east-1&ssl=true'

// DigitalOcean Spaces
's3://ACCESS_KEY:SECRET_KEY@nyc3.digitaloceanspaces.com/my-bucket?region=nyc3&ssl=true'

// MinIO
's3://ACCESS_KEY:SECRET_KEY@play.min.io/my-bucket?region=us-east-1'
```

## Configuration

The `uploads` section accepts three options:

```ts
pruvious: {
  uploads: {
    // Where files are stored.
    driver: 'fs://.uploads',

    // URL prefix where uploaded files are served from.
    // The dashboard and `<PruviousImage>` build URLs against this.
    basePath: '/uploads/',

    // Maximum size of a single uploaded file, in bytes.
    // Requests above this are rejected with 413 Payload Too Large.
    // Set to 0 to disable (not recommended).
    maxFileSize: 134217728, // 128 MB
  },
}
```

## The Uploads collection

Every file and every directory is a row in the `Uploads` collection. Pruvious provides it automatically - you do not define it yourself. The most useful columns are:

- `path` - normalized location in the media library (e.g. `/photos/sunset.jpg`).
- `type` - `'file'` or `'directory'`.
- `category` - resolved media category (`image`, `document`, `audio`, `video`, `archive`, `font`, ...).
- `size`, `etag`, `mime` - storage metadata.
- `imageWidth`, `imageHeight` - present for images.
- `images` - URL suffixes of previously-generated variants for this image. Populated via `registerOptimizedImage` / `deregisterOptimizedImage`, not automatically on upload.
- `description` - translatable alt-text per language.
- `author`, `editors` - access control.
- `isLocked`, `multipart` - internal state for in-flight multipart uploads.

You can query it like any other collection:

```ts
import { selectFrom } from '#pruvious/server'

const heroImages = await selectFrom('Uploads')
  .select(['id', 'path', 'imageWidth', 'imageHeight'])
  .where('category', '=', 'image')
  .where('path', 'like', '/hero/%')
  .all()
```

## Uploading via the API

The `/api/uploads` endpoint accepts both single and multi-file `multipart/form-data` POSTs. Field names become file paths, and an optional `input` JSON field carries metadata.

```bash
curl -X POST http://localhost:3000/api/uploads \
  -H "Authorization: Bearer $TOKEN" \
  -F "/photos/sunset.jpg=@./sunset.jpg" \
  -F 'input={"description":{"en":"A beautiful sunrise"}}'
```

The response is an array of result objects, one per uploaded file:

```json
[
  {
    "success": true,
    "data": { "id": 42, "path": "/photos/sunset.jpg", ... },
    "details": { "id": 42, "path": "/photos/sunset.jpg", "type": "file" }
  }
]
```

Query parameters:

- `?overwrite=true` - replace an existing upload at the same path.
- `?returning=id,path` - limit the returned fields.
- `?populate=true` - return populated field values instead of raw casted values.

To create a directory instead of a file, POST a JSON body with `type: 'directory'`:

```ts
await $fetch('/api/uploads', {
  method: 'POST',
  body: { path: '/blog/images', type: 'directory' },
})
```

### From the dashboard or your own pages

The client-side helpers in `#pruvious/dashboard` wrap the same endpoint with progress reporting, abort support, and optional multipart routing.

```vue
<script lang="ts" setup>
import { upload } from '#pruvious/dashboard'

async function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const results = await upload([...input.files], {
    returning: ['id', 'path'],
  })

  for (const result of results) {
    if (result.success) {
      console.log(`Uploaded: ${result.data.path}`)
    }
  }
}
</script>

<template>
  <input type="file" multiple @change="onPick" />
</template>
```

`useUpload()` returns a reactive shape (status, progress, abort) instead of a plain promise:

```ts
import { useUpload } from '#pruvious/dashboard'

const uploads = useUpload([...files])
// uploads[i].status   -> 'pending' | 'uploading' | 'completed' | 'failed' | 'aborted'
// uploads[i].progress -> 0..1
// uploads[i].abort()  -> cancel the in-flight request
```

## Multipart uploads

For files larger than `8 MB` (configurable per call), the client splits the file into chunks and uploads them sequentially. This is automatic in `upload()` and `useUpload()` - you do not need to opt in.

Multipart is driven by four endpoints:

- `POST /api/uploads/multipart` - allocates a multipart key and locks the row.
- `PUT /api/uploads/multipart/:key?partNumber=N` - uploads one part.
- `POST /api/uploads/multipart/:key` - completes the upload and unlocks the row.
- `DELETE /api/uploads/multipart/:key` - aborts and cleans up parts.

If the browser closes mid-upload, the row stays locked. The built-in `pruvious-clean-multipart-uploads` job runs every 24 hours and aborts anything older than that, releasing both the row and the storage parts.

To tune the threshold:

```ts
await upload(file, { multipartThreshold: '32 MB' }) // string
await upload(file, { multipartThreshold: 32 * 1024 * 1024 }) // bytes
await upload(file, { multipartThreshold: false }) // disable multipart entirely
```

## Image optimization

Images can be served in transformed variants - resized, reformatted, cropped - either by request or pre-generated.

### Variants

Configure named variants in `nuxt.config.ts`:

```ts
pruvious: {
  images: {
    variants: {
      thumbnail: { format: 'webp', width: 320, height: 320, fit: 'contain' },
      medium:    { format: 'webp', width: 1024 },
      large:     { format: 'webp', width: 1920 },
      hero:      { format: 'avif', width: 2400, height: 1200, fit: 'cover' },
    },
  },
}
```

The `thumbnail` variant exists by default. Anything you define is merged on top, and you can redefine `thumbnail` to override it.

### Variant options

Each variant accepts the following options:

```ts
interface ImageVariantOptions {
  format: 'webp' | 'jpeg' | 'png' | 'avif' | 'gif'
  width?: number | 'auto'   // @default 'auto'
  height?: number | 'auto'  // @default 'auto'
  fit?: 'cover' | 'contain' // @default 'cover'
  quality?: number          // 0..100, @default 80
  position?: 'center' | 'top' | 'topRight' | 'right' | 'bottomRight'
            | 'bottom' | 'bottomLeft' | 'left' | 'topLeft' // @default 'center'
  rotate?: number              // @default 0 (only 90, 180, or 270 are honored)
  blur?: number              // 0..1, @default 0
  sharpen?: number           // 0..1, @default 0
  brightness?: number        // multiplier, @default 1
  preserveAnimation?: boolean // GIF / animated WebP, @default false
}
```

The two `fit` modes behave like this:

- `cover` - maintains aspect ratio, crops to fill exact dimensions.
- `contain` - maintains aspect ratio, fits inside the box. The resulting image may be smaller than the requested dimensions to avoid distortion.

The transform engine depends on the runtime: Node uses [Sharp](https://sharp.pixelplumbing.com/), Cloudflare Workers use [Cloudflare Images](https://developers.cloudflare.com/images/).

### On-demand variants

Variants are encoded into the URL itself. When the dashboard or `<PruviousImage>` requests `/uploads/photos/sunset_oextjpg_w320_h320_contain.webp`, Pruvious checks whether the file exists and, if not, generates it on the fly and caches it on disk.

The first request pays the optimization cost. Every subsequent request is served straight from storage.

### Pre-generation via the queue

If you want a variant ready before anyone asks for it, queue an optimization job manually. Nothing in the field layer calls this for you - wire it up from a collection hook (see below).

```ts
import { queueImageOptimization } from '#pruvious/server'

await queueImageOptimization(uploadId, {
  format: 'webp',
  originalExtension: '.jpg',
  width: 1920,
})
```

The job runs `pruvious-optimize-image` with `retry: { count: 5, delay: 1000 }`.

## `<PruviousImage>` and `<PruviousPicture>`

Two components render image variants with the right dimensions and alt-text.

### Single image

```vue
<script lang="ts" setup>
import { selectFrom } from '#pruvious/server'

const { data: hero } = await useAsyncData(() =>
  selectFrom('Uploads').where('id', '=', 1).first(),
)
</script>

<template>
  <PruviousImage :image="hero" variant="medium" loading="eager" />
</template>
```

Props:

- `image` - the populated image record (needs at least `path` and `mime`).
- `variant` - either a key from `pruvious.images.variants` or an inline `ImageVariantOptions` object. Omit to render the original.
- `alt` - override the auto-resolved alt-text (otherwise the upload's `description` is used, translated to the active language).
- `loading` - `'lazy'` (default) or `'eager'`.
- `decoding` - `'async'` (default), `'sync'`, or `'auto'`.

`width` and `height` attributes are computed from the source dimensions and the variant box, so the browser reserves the right space - no layout shift.

### Responsive `<picture>`

`<PruviousPicture>` builds a `<picture>` with one `<source>` per breakpoint and an `<img>` fallback.

```vue
<template>
  <PruviousPicture
    :image="hero"
    :sources="[
      { variant: 'thumbnail', media: '(max-width: 640px)' },
      { variant: 'medium',    media: '(max-width: 1280px)' },
      { variant: 'large' },
    ]"
    :img-attrs="{ class: 'rounded-lg' }"
  />
</template>
```

The last source in the list is also used as the `<img>` fallback (its variant determines the rendered image when no media query matches). Each source descriptor accepts:

- `variant` - variant name or inline options. Omit to use the original.
- `media` - any media query.
- `type` - overrides the MIME type on the `<source>`.

For non-optimizable types (icons, BMP, ...) both components fall back to the original file so you do not have to type-check before rendering.

## Image field vs file field

When you define a collection, two field helpers wrap the `Uploads` collection:

- `imageField()` - constrained to images. Populated values include `imageWidth`, `imageHeight`, `description`, and the registered `images` variants. Ideal for `<PruviousImage>` / `<PruviousPicture>`.
- `fileField()` - any media type. Use it for documents, downloads, audio, video.

```ts
import { defineCollection, imageField, fileField, textField } from '#pruvious/server'

export default defineCollection({
  fields: {
    title: textField({}),
    cover: imageField({}),
    attachment: fileField({}),
  },
})
```

`imageField()` does not pre-generate variants on its own. To warm a set of variants whenever an image is saved, call `queueImageOptimization(uploadIdOrPath, options)` from a collection hook. Override the `Uploads` template and attach an `afterQueryExecution` hook:

```ts
// server/collections/Uploads.ts
import { defineCollectionFromTemplate, queueImageOptimization } from '#pruvious/server'
import { extname } from 'pathe'

export default defineCollectionFromTemplate('Uploads', (template) => ({
  ...template,
  hooks: {
    ...template.hooks,
    afterQueryExecution: [
      ...(template.hooks?.afterQueryExecution ?? []),
      async (context, { result }) => {
        if (!result.success || context.operation !== 'update') {
          return
        }

        for (const row of result.data ?? []) {
          if (row.category !== 'image' || row.isLocked || !row.path) {
            continue
          }

          const originalExtension = extname(row.path)

          await queueImageOptimization(row.id, { format: 'webp', originalExtension, width: 320 })
          await queueImageOptimization(row.id, { format: 'webp', originalExtension, width: 1280 })
        }
      },
    ],
  },
}))
```

`queueImageOptimization()` requires an `originalExtension` (with the leading dot, e.g. `.jpg`) on its options - the optimizer uses it to derive the source format. `queueImageOptimization` itself dedupes via a unique job key, so re-saving the same upload will not pile up duplicate work.

## Other endpoints

All endpoints respect the `collection:uploads:*` permissions.

| Endpoint | Purpose |
| --- | --- |
| `PATCH /api/uploads/path/*path` | Update `author`, `editors`, or `description`. Pass `?recursive=true` for directories. |
| `PATCH /api/uploads/move/path/*path` | Move (rename) a file or directory. Body: `{ path: '/new/path' }`. |
| `DELETE /api/uploads/path/*path` | Delete a file or directory. Pass `?recursive=true` for non-empty directories. |
| `GET /api/uploads/optimize-image/*path` | Generate and stream a variant for an existing image. The path encodes the variant (e.g. `photo_oextjpg_w320_h320_contain.webp`). |
| `PATCH /api/uploads/:id` | Update upload metadata by ID. |
| `DELETE /api/uploads/:id` | Delete an upload by ID. |

The matching server-side helpers in `#pruvious/server` (`putUpload`, `moveUpload`, `updateUpload`, `deleteUpload`, `createOptimizedImage`, ...) are available if you need to bypass the HTTP layer.
