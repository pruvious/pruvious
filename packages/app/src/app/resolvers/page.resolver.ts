import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router'
import { Observable, of } from 'rxjs'
import { catchError, tap } from 'rxjs/operators'
import { ApiService, Page } from 'src/app/services/api.service'
import { BlockService } from 'src/app/services/block.service'

@Injectable()
export class PageResolver implements Resolve<Partial<Page> | null> {
  constructor(
    protected api: ApiService,
    protected blockService: BlockService,
    protected router: Router,
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<Partial<Page> | null> {
    return this.api.getPage(route.paramMap.get('id')!).pipe(
      tap(() => {
        this.blockService.reset()
      }),
      catchError(() => {
        this.router.navigate(['/pages'])
        return of(null)
      }),
    )
  }
}
