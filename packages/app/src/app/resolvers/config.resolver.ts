import { HttpErrorResponse } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Resolve, Router } from '@angular/router'
import bytes from 'bytes'
import { Observable, of } from 'rxjs'
import { catchError, switchMap, tap } from 'rxjs/operators'
import { ApiService, AppConfig } from 'src/app/services/api.service'
import { AuthService } from 'src/app/services/auth.service'
import { BlockService } from 'src/app/services/block.service'
import { ConfigService } from 'src/app/services/config.service'

@Injectable()
export class ConfigResolver implements Resolve<AppConfig | null> {
  constructor(
    protected api: ApiService,
    protected auth: AuthService,
    protected blockService: BlockService,
    protected config: ConfigService,
    protected router: Router,
  ) {}

  resolve(): Observable<AppConfig | null> {
    return this.api.getConfig().pipe(
      tap((config) => {
        const uploadLimit = bytes.parse(config.uploads!.uploadLimit!)

        this.config.siteBaseUrl = config.siteBaseUrl
        this.config.uploadLimit = uploadLimit
        this.config.uploadLimitHuman = bytes.format(uploadLimit)
        this.config.cms = config.cms
        this.config.pages = config.pages
        this.config.presets = config.presets
        this.config.uploads = config.uploads
        this.config.collections = config.collections
        this.config.roles = config.roles
        this.config.users = config.users
        this.config.capabilities = config.capabilities
        this.config.me = config.me
        this.blockService.blocks = Object.fromEntries(
          config.blocks.map((block) => [block.name, block]),
        )
        this.config.currentLanguage = this.config.currentLanguage

        config.capabilities.forEach((capability) => {
          this.config.can[capability] =
            config.me.isAdmin || config.me.combinedCapabilities!.includes(capability)
        })
      }),
      catchError((response: HttpErrorResponse) => {
        if (response.status === 403) {
          return this.api.logout().pipe(
            tap(() => {
              this.auth.accessToken = null
              this.router.navigate(['/'])
            }),
            switchMap(() => of(null)),
          )
        }

        return of(null)
      }),
    )
  }
}
