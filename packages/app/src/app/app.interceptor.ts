import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { ToastrService } from 'ngx-toastr'
import { finalize, Observable, throwError } from 'rxjs'
import { catchError, timeout } from 'rxjs/operators'
import { AuthService } from 'src/app/services/auth.service'
import { LoadingService } from 'src/app/services/loading.service'

@Injectable({
  providedIn: 'root',
})
export class AppInterceptor implements HttpInterceptor {
  constructor(
    protected auth: AuthService,
    protected loading: LoadingService,
    protected router: Router,
    protected toastr: ToastrService,
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Clone the request object
    let newReq = req.clone()

    // Add request to loading service
    this.loading.add('http')

    // Request
    if (!this.auth.isTokenExpired(this.auth.accessToken)) {
      newReq = req.clone({
        headers: req.headers.set('Authorization', 'Bearer ' + this.auth.accessToken!.token),
      })
    }

    // Response
    return next.handle(newReq).pipe(
      timeout(20000),
      catchError((errorResponse: HttpErrorResponse) => {
        if (errorResponse instanceof HttpErrorResponse) {
          let item: string = 'Row'

          if (newReq.url.includes('/pages/')) {
            item = 'Page'
          } else if (newReq.url.includes('/previews/')) {
            item = 'Preview'
          } else if (newReq.url.includes('/presets/')) {
            item = 'Preset'
          } else if (newReq.url.includes('/collections/')) {
            item = 'Post'
          } else if (newReq.url.includes('/roles/')) {
            item = 'Role'
          } else if (newReq.url.includes('/users/')) {
            item = 'User'
          } else if (newReq.url.includes('/directories/')) {
            item = 'Directory'
          } else if (newReq.url.includes('/uploads/')) {
            item = 'File'
          } else if (newReq.url.includes('/settings/')) {
            item = 'Settings'
          }

          const message = errorResponse.error.message
            ? errorResponse.error.message
                .replace(/^[A-Z_ ]+: /, '')
                .replace('Row not found', `${item} not found`)
            : ''

          if (errorResponse.status === 401 && !this.router.url.startsWith('/login')) {
            this.auth.accessToken = null
            setTimeout(() => this.router.navigate(['/login']))
          } else if (errorResponse.status === 403) {
            this.toastr.error(message)
          } else if (
            (errorResponse.status > 400 && errorResponse.status !== 422) ||
            errorResponse.status === 0
          ) {
            let silent: boolean = false

            try {
              silent = new URLSearchParams(new URL(req.url).search).has('silent')
            } catch (_) {}

            if (!silent) {
              this.toastr.error(message || 'Cannot connect to server')
            }
          }
        }

        return throwError(() => errorResponse)
      }),
      finalize(() => this.loading.remove('http')),
    )
  }
}
