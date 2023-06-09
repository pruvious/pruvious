import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router'
import { PresetRecord } from '@pruvious/shared'
import { Observable, of } from 'rxjs'
import { catchError, tap } from 'rxjs/operators'
import { ApiService } from 'src/app/services/api.service'
import { BlockService } from 'src/app/services/block.service'

@Injectable()
export class PresetResolver implements Resolve<Partial<PresetRecord> | null> {
  constructor(
    protected api: ApiService,
    protected blockService: BlockService,
    protected router: Router,
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<Partial<PresetRecord> | null> {
    return this.api.getPreset(route.paramMap.get('id')!).pipe(
      tap(() => {
        this.blockService.reset()
      }),
      catchError(() => {
        this.router.navigate(['/presets'])
        return of(null)
      }),
    )
  }
}
