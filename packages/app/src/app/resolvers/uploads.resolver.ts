import { Injectable } from '@angular/core'
import { Resolve, Router } from '@angular/router'
import { UploadRecord } from '@pruvious-test/shared'
import { Observable, of } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { ApiService } from 'src/app/services/api.service'

@Injectable()
export class UploadsResolver implements Resolve<Partial<UploadRecord>[]> {
  constructor(protected api: ApiService, protected router: Router) {}

  resolve(): Observable<Partial<UploadRecord>[]> {
    return this.api.allUploads({}).pipe(
      catchError(() => {
        this.router.navigate(['/'])
        return of([])
      }),
    )
  }
}
