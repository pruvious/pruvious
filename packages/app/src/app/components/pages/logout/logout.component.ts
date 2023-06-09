import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService } from 'src/app/services/api.service'
import { AuthService } from 'src/app/services/auth.service'

@Component({
  selector: 'app-logout',
  template: '',
})
export class LogoutComponent extends BaseComponent {
  constructor(protected api: ApiService, protected auth: AuthService, protected router: Router) {
    super()

    this.api
      .logout()
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe(() => {
        this.auth.accessToken = null
        this.router.navigate(['/'])
      })
  }
}
