import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router'
import { PostRecord } from '@pruvious-test/shared'
import { Observable, of } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { ApiService } from 'src/app/services/api.service'

@Injectable()
export class PostResolver implements Resolve<Partial<PostRecord> | null> {
  constructor(protected api: ApiService, protected router: Router) {}

  resolve(route: ActivatedRouteSnapshot): Observable<Partial<PostRecord> | null> {
    return this.api.getPost(route.paramMap.get('collection')!, route.paramMap.get('id')!).pipe(
      catchError(() => {
        this.router.navigate(['/collections', route.paramMap.get('collection')!])
        return of(null)
      }),
    )
  }
}
