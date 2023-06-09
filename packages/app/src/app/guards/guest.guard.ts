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
import { ApiService } from 'src/app/services/api.service'
import { AuthService } from 'src/app/services/auth.service'

@Injectable()
export class GuestGuard implements CanActivate, CanActivateChild, CanMatch {
  constructor(protected api: ApiService, protected auth: AuthService, protected router: Router) {}

  protected check(): Observable<boolean> {
    if (this.auth.isTokenExpired(this.auth.accessToken)) {
      this.auth.accessToken = null
      return of(true)
    }

    this.router.navigate(['/'])
    return of(false)
  }

  canActivate(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.check()
  }

  canActivateChild(
    _childRoute: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.check()
  }

  canMatch(
    _route: Route,
    _segments: UrlSegment[],
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.check()
  }
}
