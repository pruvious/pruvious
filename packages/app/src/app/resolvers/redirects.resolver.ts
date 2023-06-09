import { Injectable } from '@angular/core'
import { Resolve, Router } from '@angular/router'
import { Redirect } from '@pruvious/shared'
import { Observable, of } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { ApiService } from 'src/app/services/api.service'
import { ConfigService } from 'src/app/services/config.service'

@Injectable()
export class RedirectsResolver implements Resolve<Redirect[] | null> {
  constructor(
    protected api: ApiService,
    protected config: ConfigService,
    protected router: Router,
  ) {}

  resolve(): Observable<Redirect[] | null> {
    if (this.config.cms.pages === false) {
      this.router.navigate(['/'])
      return of(null)
    }

    return this.api.getRedirects().pipe(
      catchError(() => {
        this.router.navigate(['/'])
        return of(null)
      }),
    )
  }
}
