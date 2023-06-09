import { Injectable } from '@angular/core'
import { Resolve, Router } from '@angular/router'
import { Observable, of } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { ApiService, Directory } from 'src/app/services/api.service'

@Injectable()
export class DirectoriesResolver implements Resolve<Partial<Directory>[]> {
  constructor(protected api: ApiService, protected router: Router) {}

  resolve(): Observable<Partial<Directory>[]> {
    return this.api.getRootDirectories().pipe(
      catchError(() => {
        this.router.navigate(['/'])
        return of([])
      }),
    )
  }
}
