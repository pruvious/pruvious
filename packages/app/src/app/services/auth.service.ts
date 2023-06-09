import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { OAT } from '@pruvious/shared'
import { Bind } from '@pruvious/utils'
import { catchError, of, Subject, tap } from 'rxjs'
import { ApiService } from 'src/app/services/api.service'

@Injectable()
export class AuthService {
  accessTokenRenewed$: Subject<void> = new Subject()

  set accessToken(token: OAT | null) {
    if (!this.isTokenExpired(token)) {
      localStorage.setItem('accessToken', JSON.stringify(token))
      this.accessTokenRenewed$.next()
    } else if (this.accessToken) {
      localStorage.clear()
      this.accessTokenRenewed$.next()
    }
  }

  get accessToken(): OAT | null {
    const item = localStorage.getItem('accessToken')

    if (!item) {
      return null
    }

    return JSON.parse(item)
  }

  constructor(protected api: ApiService, protected router: Router) {
    // Check authentication status about every 2 minutes
    setInterval(this.check, 120000 + (Math.random() > 0.5 ? 1 : -1) * Math.random() * 10000)

    window.addEventListener('focus', this.check)
  }

  /**
   * Renew token if it expires in less than 15 minutes
   */
  @Bind
  check(): void {
    if (this.accessToken && this.isTokenExpired(this.accessToken)) {
      this.accessToken = null
      this.router.navigate(['/'])
    } else if (this.accessToken && this.tokenExpiresIn(this.accessToken) < 900000) {
      this.refreshToken()
    }
  }

  refreshToken(): Promise<OAT | null> {
    return new Promise<OAT | null>((resolve) => {
      this.api
        .refreshToken()
        .pipe(
          tap((oat) => {
            this.accessToken = oat
            resolve(oat)
          }),
          catchError(() => {
            resolve(null)
            return of(null)
          }),
        )
        .subscribe()
    })
  }

  isTokenExpired(token: OAT | null): boolean {
    return !token || Date.parse(token.expires_at) < Date.now()
  }

  tokenExpiresIn(token: OAT): number {
    return Date.parse(token.expires_at) - Date.now()
  }
}
