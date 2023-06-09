import { Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute, Params, Router } from '@angular/router'
import { takeUntil } from 'rxjs'
import { BaseComponent } from 'src/app/components/base.component'
import { ApiService } from 'src/app/services/api.service'
import { AuthService } from 'src/app/services/auth.service'
import { ConfigService } from 'src/app/services/config.service'
import { Validator } from 'src/app/utils/Validator'

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent extends BaseComponent implements OnInit, OnDestroy {
  email: string = ''

  password: string = ''

  remember: boolean = false

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
    this.config.setTitle('Login')

    if (this.config.status === 'active') {
      this.ready = true
    } else {
      this.router.navigate(['/install'])
    }
  }

  ngOnInit(): void {
    document.documentElement.classList.add('auth')
  }

  onSubmit(): void {
    if (this.validator.isLocked) {
      return
    }

    this.validator.reset().lock()

    this.api
      .login(this.email, this.password, this.remember)
      .pipe(takeUntil(this.unsubscribeAll$))
      .subscribe({
        next: (oat) => {
          this.validator.reset()
          this.auth.accessToken = oat

          if (this.route.snapshot.queryParamMap.has('redirect')) {
            try {
              const url = new URL(
                'http://__pruvious' + decodeURI(this.route.snapshot.queryParamMap.get('redirect')!),
              )
              const queryParams: Params = {}
              const search = new URLSearchParams(url.search)

              for (const [key, value] of search.entries()) {
                queryParams[key] = value
              }

              this.router.navigate([url.pathname], { queryParams })
            } catch (_) {
              this.router.navigate(['/logged-in-redirect'])
            }
          } else {
            this.router.navigate(['/logged-in-redirect'])
          }
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

  override ngOnDestroy(): void {
    super.ngOnDestroy()
    document.documentElement.classList.remove('auth')
  }
}
