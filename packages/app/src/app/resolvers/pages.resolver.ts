import { Injectable } from '@angular/core'
import { Resolve, Router } from '@angular/router'
import { ConfigService } from 'src/app/services/config.service'

@Injectable()
export class PagesResolver implements Resolve<void> {
  constructor(protected config: ConfigService, protected router: Router) {}

  resolve(): void {
    if (this.config.cms.pages === false || !this.config.can['readPages']) {
      for (const collection of Object.keys(this.config.collections)) {
        if (this.config.can[`readPosts:${collection}`]) {
          this.router.navigate([`/collections/${collection}/posts`])
          return
        }
      }

      this.router.navigate(['/profile'])
    }
  }
}
