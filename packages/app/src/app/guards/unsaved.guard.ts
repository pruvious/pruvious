import { Injectable } from '@angular/core'
import { CanDeactivate } from '@angular/router'
import { Observable, of, switchMap } from 'rxjs'
import { DialogService } from 'src/app/services/dialog.service'

export interface UnsavedChanges {
  canDeactivate: () => boolean
}

@Injectable()
export class UnsavedGuard implements CanDeactivate<UnsavedChanges> {
  constructor(protected dialog: DialogService) {}

  canDeactivate(component: UnsavedChanges): Observable<boolean> | boolean {
    if (component.canDeactivate()) {
      return true
    } else if (!this.dialog.isActive()) {
      return this.dialog
        .open({
          message: 'Changes that you made may not be saved.',
          buttons: [
            {
              label: 'Cancel',
              value: 'cancel',
              color: 'white',
            },
            {
              label: 'Leave page',
              value: 'leave',
            },
          ],
        })
        .pipe(
          switchMap((action: string) => {
            if (action === 'leave') {
              return of(true)
            }

            return of(false)
          }),
        )
    } else {
      return false
    }
  }
}
