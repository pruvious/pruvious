import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router'
import { Observable, of } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { ApiService } from 'src/app/services/api.service'
import { ConfigService } from '../services/config.service'

@Injectable()
export class SettingResolver implements Resolve<Record<string, any> | null> {
  constructor(
    protected api: ApiService,
    protected config: ConfigService,
    protected router: Router,
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<Record<string, any> | null> {
    return this.api.getSettingRaw(route.paramMap.get('name')!, this.config.currentLanguage).pipe(
      catchError(() => {
        this.router.navigate(['/'])
        return of(null)
      }),
    )
  }
}
