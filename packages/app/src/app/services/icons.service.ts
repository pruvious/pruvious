import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { ApiService } from 'src/app/services/api.service'

@Injectable()
export class IconsService {
  icons$ = new BehaviorSubject<Record<string, string> | null>(null)

  constructor(protected api: ApiService) {
    this.api.getIcons().subscribe((response) => {
      this.icons$.next(response.icons)
    })
  }
}
