import { Injectable } from '@angular/core'
import { Resolve } from '@angular/router'
import { Settings } from '@pruvious/shared'
import { Observable, of } from 'rxjs'
import { catchError, tap } from 'rxjs/operators'
import { ApiService } from 'src/app/services/api.service'
import { ConfigService } from '../services/config.service'

@Injectable()
export class SettingsResolver implements Resolve<Partial<Settings>[]> {
  constructor(protected api: ApiService, protected config: ConfigService) {}

  resolve(): Observable<Partial<Settings>[]> | Settings[] {
    if (this.config.can['listSettings']) {
      return this.api.getSettings().pipe(
        tap((settingConfigs) => {
          for (const settingConfig of settingConfigs) {
            this.config.settings[settingConfig.group] = settingConfig
          }
        }),
        catchError(() => of([])),
      )
    }

    return []
  }
}
