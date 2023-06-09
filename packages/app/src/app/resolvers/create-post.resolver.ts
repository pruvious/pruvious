import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router'
import { ConfigService } from 'src/app/services/config.service'

@Injectable()
export class CreatePostResolver implements Resolve<void> {
  constructor(protected config: ConfigService, protected router: Router) {}

  resolve(route: ActivatedRouteSnapshot): void {
    const collection = route.paramMap.get('collection')

    if (!this.config.can[`createPosts:${collection}`]) {
      this.router.navigate(['/collections', collection, 'posts'])
    }
  }
}
