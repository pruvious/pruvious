import Drive from '@ioc:Adonis/Core/Drive'
import {
  afterCreate,
  afterFetch,
  afterFind,
  BaseModel,
  beforeDelete,
  beforeSave,
  belongsTo,
  BelongsTo,
  column,
  ExtractModelRelations,
} from '@ioc:Adonis/Lucid/Orm'
import Upload from 'App/Models/Upload'
import { DateTime } from 'luxon'
import path from 'path'
import sharp from 'sharp'

export default class Image extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column({ meta: { type: 'string' } })
  public path: string | null

  @column()
  public format: 'jpeg' | 'png' | 'webp' | null

  @column()
  public width: number | null

  @column()
  public height: number | null

  @column()
  public resize: 'contain' | 'cover' | 'fill' | 'inside' | 'outside' | null

  @column()
  public position:
    | 'top'
    | 'topRight'
    | 'right'
    | 'bottomRight'
    | 'bottom'
    | 'bottomLeft'
    | 'left'
    | 'topLeft'
    | null

  @column()
  public interpolation: 'cubic' | 'lanczos2' | 'lanczos3' | 'mitchell' | 'nearest' | null

  @column()
  public quality: number | null

  @column()
  public alphaQuality: number | null

  @column()
  public lossless: boolean | null

  @column()
  public nearLossless: boolean | null

  @column()
  public smartSubsample: boolean | null

  @column()
  public info: { format?: string; width?: number; height?: number }

  @column({ serializeAs: null })
  public uploadId: number

  @belongsTo(() => Upload)
  public upload: BelongsTo<typeof Upload>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @beforeSave()
  public static async beforeSave(image: Image) {
    if (image.$dirty.info) {
      image.info = JSON.stringify(image.info) as any
    }
  }

  @afterCreate()
  public static async afterCreate(image: Image) {
    await image.generate()
  }

  @afterFind()
  public static async afterFind(image: Image) {
    image.lossless = typeof image.lossless === 'boolean' ? !!image.lossless : null
    image.nearLossless = typeof image.nearLossless === 'boolean' ? !!image.nearLossless : null
    image.smartSubsample = typeof image.smartSubsample === 'boolean' ? !!image.smartSubsample : null

    if (typeof image.info === 'string') {
      image.info = JSON.parse(image.info)
    }

    if (!image.path) {
      await image.resolvePath()
    }
  }

  @afterFetch()
  public static async afterFetch(images: Image[]) {
    for (const image of images) {
      await Image.afterFind(image)
    }
  }

  @beforeDelete()
  public static async beforeDelete(image: Image) {
    if (image.path) {
      try {
        await Drive.delete(image.path)
      } catch (_) {}
    }
  }

  async $relation(relation: ExtractModelRelations<Image>) {
    if (!this.$preloaded[relation!]) {
      await (this as Image).load(relation)
    }

    return this[relation!]
  }

  public async generate() {
    try {
      await this.$relation('upload')
      await this.resolvePath()

      const originalImage = await Drive.get(this.upload.path!)
      const sharpImage = sharp(originalImage)

      if (this.format === 'png') {
        sharpImage.png({ quality: this.quality ?? undefined })
      } else if (this.format === 'webp') {
        sharpImage.webp({
          quality: this.quality ?? undefined,
          alphaQuality: this.alphaQuality ?? undefined,
          lossless: this.lossless ?? undefined,
          nearLossless: this.nearLossless ?? undefined,
          smartSubsample: this.smartSubsample ?? undefined,
        })
      } else {
        sharpImage.jpeg({ quality: this.quality ?? undefined })
      }

      sharpImage.resize({
        width: this.width ?? undefined,
        height: this.height ?? undefined,
        fit: this.resize ?? undefined,
        position: Image.positionToSharp(this.position),
        kernel: this.interpolation ?? undefined,
      })

      await Drive.put(this.path!, await sharpImage.toBuffer(), { cacheControl: 'max-age=2592000' })

      const optimizedImage = await Drive.get(this.path!)
      this.info = await sharp(optimizedImage).metadata()
      await this.save()
    } catch (_) {}
  }

  public async resolvePath() {
    await this.$relation('upload')

    if (!this.upload.path) {
      await this.upload.resolvePath()
    }

    const baseName = path.basename(this.upload.name)
    const extension = this.format ? `.${this.format}` : path.extname(this.upload.name)
    const newPath =
      this.upload.path!.slice(0, -this.upload.name.length) +
      `${baseName}--o--${this.getSuffix()}${extension}`

    if (this.path !== newPath) {
      if (this.path) {
        try {
          await Drive.move(this.path, newPath, { cacheControl: 'max-age=2592000' })
        } catch (_) {}
      }

      this.path = newPath
      await this.save()
    }
  }

  public getSuffix(separator: string = '-') {
    const parts: string[] = []

    if (this.format) {
      parts.push(this.format)
    }

    if (this.width) {
      parts.push(`w-${this.width}`)
    }

    if (this.height) {
      parts.push(`h-${this.height}`)
    }

    if (this.resize) {
      parts.push(`r-${this.resize}`)
    }

    if (this.position) {
      parts.push(`p-${this.position}`)
    }

    if (this.interpolation) {
      parts.push(`i-${this.interpolation}`)
    }

    if (this.quality) {
      parts.push(`q-${this.quality}`)
    }

    if (this.alphaQuality) {
      parts.push(`aq-${this.alphaQuality}`)
    }

    if (this.lossless) {
      parts.push('lossless')
    }

    if (this.nearLossless) {
      parts.push('nearLossless')
    }

    if (this.smartSubsample) {
      parts.push('smartSubsample')
    }

    return parts.join(separator)
  }

  public static positionToSharp(position: Image['position']) {
    if (position === 'topRight') {
      return 'right top'
    } else if (position === 'bottomRight') {
      return 'right bottom'
    } else if (position === 'bottomLeft') {
      return 'left bottom'
    } else if (position === 'topLeft') {
      return 'left top'
    }

    return position ?? undefined
  }
}
