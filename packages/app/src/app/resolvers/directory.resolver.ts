import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router'
import { Observable, of } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { ApiService, Directory } from 'src/app/services/api.service'

@Injectable()
export class DirectoryResolver implements Resolve<Partial<Directory> | null> {
  constructor(protected api: ApiService, protected router: Router) {}

  resolve(route: ActivatedRouteSnapshot): Observable<Partial<Directory> | null> {
    return this.api.getDirectory(route.paramMap.get('id')!).pipe(
      catchError(() => {
        this.router.navigate(['/media'])
        return of(null)
      }),
    )
  }
}
