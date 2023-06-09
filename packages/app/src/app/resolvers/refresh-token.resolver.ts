import { Injectable } from '@angular/core'
import { Resolve } from '@angular/router'
import { OAT } from '@pruvious/shared'
import { AuthService } from 'src/app/services/auth.service'

@Injectable()
export class RefreshTokenResolver implements Resolve<OAT | null> {
  constructor(protected auth: AuthService) {}

  resolve(): Promise<OAT | null> {
    return this.auth.refreshToken()
  }
}
