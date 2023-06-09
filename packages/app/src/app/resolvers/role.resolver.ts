import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router'
import { RoleRecord } from '@pruvious-test/shared'
import { Observable, of } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { ApiService } from 'src/app/services/api.service'

@Injectable()
export class RoleResolver implements Resolve<Partial<RoleRecord> | null> {
  constructor(protected api: ApiService, protected router: Router) {}

  resolve(route: ActivatedRouteSnapshot): Observable<Partial<RoleRecord> | null> {
    return this.api.getRole(route.paramMap.get('id')!).pipe(
      catchError(() => {
        this.router.navigate(['/roles'])
        return of(null)
      }),
    )
  }
}
