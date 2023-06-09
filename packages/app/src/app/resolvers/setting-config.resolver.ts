import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router'
import { Settings } from '@pruvious/shared'
import { Observable, of } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { ApiService } from 'src/app/services/api.service'

@Injectable()
export class SettingConfigResolver implements Resolve<Settings | null> {
  constructor(protected api: ApiService, protected router: Router) {}

  resolve(route: ActivatedRouteSnapshot): Observable<Settings | null> {
    return this.api.getSettingConfig(route.paramMap.get('name')!).pipe(
      catchError(() => {
        this.router.navigate(['/'])
        return of(null)
      }),
    )
  }
}
