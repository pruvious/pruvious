import { Injectable } from '@angular/core'
import {
  Collection,
  Config,
  Pages,
  Presets,
  Roles,
  Settings,
  Uploads,
  UserRecord,
  Users,
} from '@pruvious/shared'
import { Subject } from 'rxjs'

@Injectable()
export class ConfigService {
  baseTitle: string = document.title

  status: 'active' | 'blank' = 'active'

  cmsBaseUrl: string = (window as any).cmsBaseUrl

  siteBaseUrl: string = ''

  apiBaseUrl: string = `${this.cmsBaseUrl}/api`

  uploadsBaseUrl: string = `${this.cmsBaseUrl}/uploads/`

  uploadLimit: number = Infinity

  uploadLimitHuman: string = 'not set'

  cms: Config = {}

  pages: Pages = {}

  presets: Presets = {}

  uploads: Uploads = {}

  collections: Record<string, Collection> = {}

  roles: Roles = {}

  users: Users = {}

  settings: Record<string, Settings> = {}

  capabilities: string[] = []

  me!: UserRecord

  can: Record<string, boolean> = {}

  set currentLanguage(code: string) {
    const current = localStorage.getItem('language')

    if (current !== code) {
      localStorage.setItem('language', code)
      this.languageChanged$.next()
    }
  }

  get currentLanguage(): string {
    const code = localStorage.getItem('language')

    if (!code || this.cms.languages?.every((language) => language.code !== code)) {
      this.currentLanguage = this.cms.defaultLanguage!
      return this.cms.defaultLanguage!
    }

    return code
  }

  languageChanged$ = new Subject<void>()

  setTitle(...title: (string | number)[]): void {
    title.push(this.baseTitle)
    document.title = title.join(' | ')
  }
}
