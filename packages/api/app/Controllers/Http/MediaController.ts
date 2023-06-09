import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Directory from 'App/Models/Directory'
import Upload from 'App/Models/Upload'
import MediaSelectionValidator from 'App/Validators/MediaSelectionValidator'
import { addInternalJob } from 'App/worker'

export default class MediaController {
  /**
   * POST: /move-media
   */
  public async move({ bouncer, request }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'updateMedia')
    await request.validate(MediaSelectionValidator)

    const target = request.input('target', null)
    let moved: number = 0

    for (const directoryId of request.input('directories')) {
      const directory = await Directory.find(directoryId)

      if (
        directory &&
        directoryId !== target &&
        !(await Directory.query()
          .where('name', directory.name)
          .andWhere('directory_id', target)
          .andWhereNot('id', directory.id)
          .first())
      ) {
        directory.directoryId = target

        await directory.save()
        await directory.resolvePathCascade()

        moved++
      }
    }

    for (const uploadId of request.input('uploads')) {
      const upload = await Upload.find(uploadId)

      if (
        upload &&
        !(await Upload.query()
          .where('name', upload.name)
          .andWhere('directory_id', target)
          .andWhereNot('id', upload.id)
          .first())
      ) {
        upload.directoryId = target

        await upload.save()
        await upload.resolvePathCascade()
        await addInternalJob('flush', 'Upload', upload.id)

        moved++
      }
    }

    return {
      items: request.input('directories').length + request.input('uploads').length,
      moved,
    }
  }

  /**
   * POST: /delete-media
   */
  public async destroy({ bouncer, request, response }: HttpContextContract) {
    await bouncer.with('UserPolicy').authorize('can', 'deleteMedia')
    await request.validate(MediaSelectionValidator)

    for (const directoryId of request.input('directories')) {
      const directory = await Directory.find(directoryId)

      if (directory) {
        await directory.delete()
      }
    }

    for (const uploadId of request.input('uploads')) {
      const upload = await Upload.find(uploadId)

      if (upload) {
        await upload.delete()
      }
    }

    return response.noContent()
  }
}
