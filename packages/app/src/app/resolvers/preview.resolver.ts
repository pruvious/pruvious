import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router'
import { Observable, of } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { ApiService, Preview } from 'src/app/services/api.service'

@Injectable()
export class PreviewResolver implements Resolve<Preview | null> {
  constructor(protected api: ApiService, protected router: Router) {}

  resolve(route: ActivatedRouteSnapshot): Observable<Preview | null> {
    return this.api
      .createPreview(
        { data: route.parent?.data['page'] || route.parent?.data['preset'] },
        route.parent?.data['preset'] ? 'preset' : 'page',
      )
      .pipe(
        catchError(() => {
          if (route.parent?.data['preset']) {
            this.router.navigate(['/presets'])
          } else {
            this.router.navigate(['/pages'])
          }

          return of(null)
        }),
      )
  }
}
