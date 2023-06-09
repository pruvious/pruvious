import { Injectable } from '@angular/core'
import { UploadRecord } from '@pruvious/shared'
import { first, Observable, Subject, takeUntil } from 'rxjs'
import { Directory } from 'src/app/services/api.service'

export interface MediaSelection {
  directories: Record<number, Partial<Directory>>
  uploads: Record<number, Partial<UploadRecord>>
}

export type MediaSelectionType = 'item' | 'items' | 'folder' | 'folders' | 'file' | 'files'

export interface PickRequirements {
  allow?: string[]
  minWidth?: number
  minHeight?: number
}

@Injectable()
export class MediaService {
  createDirectory$ = new Subject<void>()

  deleteItems$ = new Subject<void>()

  removeSelectedItems$ = new Subject<void>()

  clearSelection$ = new Subject<void>()

  moveSelection$ = new Subject<void>()

  upload$ = new Subject<void>()

  reset$ = new Subject<void>()

  refresh$ = new Subject<void>()

  choose$ = new Subject<PickRequirements | undefined>()

  pickUpload$ = new Subject<Partial<UploadRecord>>()

  editUpload$ = new Subject<Partial<UploadRecord>>()

  completePickListeners$ = new Subject<void>()

  pathChanged$ = new Subject<void>()

  countSelections(selection: MediaSelection): number {
    const directories = Object.keys(selection.directories).length
    const uploads = Object.keys(selection.uploads).length

    return directories + uploads
  }

  getSelectionType(selection: MediaSelection): MediaSelectionType {
    const directories = Object.keys(selection.directories).length
    const uploads = Object.keys(selection.uploads).length

    if (directories && uploads) {
      return directories + uploads === 1 ? 'item' : 'items'
    } else if (directories) {
      return directories === 1 ? 'folder' : 'folders'
    } else if (uploads) {
      return uploads === 1 ? 'file' : 'files'
    }

    return 'items'
  }

  listenToPicks(options?: PickRequirements): Observable<Partial<UploadRecord> | void> {
    const subject$ = new Subject<Partial<UploadRecord> | void>()

    this.pickUpload$.pipe(first(), takeUntil(subject$)).subscribe((upload) => {
      subject$.next(upload)
      subject$.complete()
    })

    this.completePickListeners$.pipe(first(), takeUntil(subject$)).subscribe(() => {
      subject$.next()
      subject$.complete()
    })

    this.choose$.next(options)

    return subject$.asObservable()
  }
}
