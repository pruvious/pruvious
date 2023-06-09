import { Injectable } from '@angular/core'
import { Resolve, Router } from '@angular/router'
import { ConfigService } from 'src/app/services/config.service'

@Injectable()
export class CreateRoleResolver implements Resolve<void> {
  constructor(protected config: ConfigService, protected router: Router) {}

  resolve(): void {
    if (!this.config.can['createRoles']) {
      this.router.navigate(['/roles'])
    }
  }
}
