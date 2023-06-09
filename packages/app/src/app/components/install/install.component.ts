import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService } from 'src/app/services/api.service'
import { AuthService } from 'src/app/services/auth.service'
import { ConfigService } from 'src/app/services/config.service'
import { Validator } from 'src/app/utils/Validator'

@Component({
  selector: 'app-install',
  templateUrl: './install.component.html',
})
export class InstallComponent extends BaseComponent {
  email: string = ''

  password: string = ''

  validator = new Validator()

  logoPath: string = (window as any).cmsLogoLogin

  ready: boolean = false

  constructor(
    protected api: ApiService,
    protected auth: AuthService,
    protected config: ConfigService,
    protected route: ActivatedRoute,
    protected router: Router,
  ) {
    super()
    this.config.setTitle('Install')

    if (this.config.status === 'blank') {
      this.ready = true
    } else {
      this.router.navigate(['/login'])
    }
  }

  onSubmit(): void {
    if (this.validator.isLocked) {
      return
    }

    this.validator.reset().lock()

    this.api
      .install(this.email, this.password)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: (oat) => {
          this.validator.reset()
          this.auth.accessToken = oat
          this.config.status = 'active'
          this.router.navigate(['/pages'])
        },
        error: (response) => {
          this.validator.reset()

          if (response.status === 422) {
            this.validator.setFieldErrors(response.error)
          } else if (response.status === 400) {
            this.validator.setGeneralError(response.error.message)
          }
        },
      })
  }
}
