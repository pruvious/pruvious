import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve, Router, RouterStateSnapshot } from '@angular/router'
import { Observable, of } from 'rxjs'
import { catchError, tap } from 'rxjs/operators'
import { ApiService } from 'src/app/services/api.service'
import { ConfigService } from 'src/app/services/config.service'
import { AuthService } from '../services/auth.service'

@Injectable()
export class HomeResolver implements Resolve<any> {
  constructor(
    protected api: ApiService,
    protected auth: AuthService,
    protected config: ConfigService,
    protected router: Router,
  ) {}

  resolve(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {
    return this.api.getHome().pipe(
      tap(({ status }) => {
        this.config.status = status

        if (status === 'blank') {
          this.auth.accessToken = null

          if (state.url !== '/install') {
            this.router.navigate(['/install'])
          }
        }
      }),
      catchError(() => of(null)),
    )
  }
}
