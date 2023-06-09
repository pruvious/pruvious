import { Injectable } from '@angular/core'
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  CanMatch,
  Route,
  Router,
  RouterStateSnapshot,
  UrlSegment,
  UrlTree,
} from '@angular/router'
import { Observable, of } from 'rxjs'
import { AuthService } from 'src/app/services/auth.service'

@Injectable()
export class AuthGuard implements CanActivate, CanActivateChild, CanMatch {
  constructor(protected auth: AuthService, protected router: Router) {}

  protected check(redirect: string): Observable<boolean> {
    if (this.auth.isTokenExpired(this.auth.accessToken)) {
      this.auth.accessToken = null

      this.router.navigate(['/login'], {
        queryParams: { redirect },
      })

      return of(false)
    }

    return of(true)
  }

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean> | Promise<boolean> | boolean {
    let redirect = state.url

    if (redirect === '/logout') {
      redirect = '/'
    }

    return this.check(redirect)
  }

  canActivateChild(
    _childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    let redirect = state.url

    if (redirect === '/logout') {
      redirect = '/'
    }

    return this.check(redirect)
  }

  canMatch(
    _route: Route,
    _segments: UrlSegment[],
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.check('/')
  }
}
