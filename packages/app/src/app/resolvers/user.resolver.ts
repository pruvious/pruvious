import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router'
import { UserRecord } from '@pruvious/shared'
import { Observable, of } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { ApiService } from 'src/app/services/api.service'

@Injectable()
export class UserResolver implements Resolve<Partial<UserRecord> | null> {
  constructor(protected api: ApiService, protected router: Router) {}

  resolve(route: ActivatedRouteSnapshot): Observable<Partial<UserRecord> | null> {
    return this.api.getUser(route.paramMap.get('id')!).pipe(
      catchError(() => {
        this.router.navigate(['/users'])
        return of(null)
      }),
    )
  }
}
