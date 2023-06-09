import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router'
import { Collection } from '@pruvious-test/shared'
import { ConfigService } from 'src/app/services/config.service'

@Injectable()
export class CollectionResolver implements Resolve<Collection | null> {
  constructor(protected config: ConfigService, protected router: Router) {}

  resolve(route: ActivatedRouteSnapshot): Collection | null {
    const collection = route.paramMap.get('collection')!

    if (!this.config.collections[collection] || !this.config.can[`readPosts:${collection}`]) {
      this.router.navigate(['/'])
      return null
    }

    return this.config.collections[collection]
  }
}
