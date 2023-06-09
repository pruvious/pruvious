import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router'
import { UploadRecord } from '@pruvious-test/shared'
import { Observable, of } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { ApiService } from 'src/app/services/api.service'

@Injectable()
export class UploadResolver implements Resolve<Partial<UploadRecord | null>> {
  constructor(protected api: ApiService, protected router: Router) {}

  resolve(route: ActivatedRouteSnapshot): Observable<Partial<UploadRecord | null>> {
    return this.api.getUpload(route.paramMap.get('id')!).pipe(
      catchError(() => {
        this.router.navigate(['/media'])
        return of(null)
      }),
    )
  }
}
