import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import {
  Block,
  BlockRecord,
  Collection,
  Config,
  OAT,
  PageRecord,
  Pages,
  PostRecord,
  PresetRecord,
  Presets,
  QueryStringParameters,
  Redirect,
  RoleRecord,
  Roles,
  SettingRecord,
  Settings,
  UploadRecord,
  Uploads,
  UserRecord,
  Users,
  stringifyQueryParameters,
} from '@pruvious-test/shared'
import { Observable, of, tap } from 'rxjs'
import { ConfigService } from 'src/app/services/config.service'
import { MediaSelection, MediaService } from 'src/app/services/media.service'

export interface Index<T> {
  data: T[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
    firstPage: number
  }
}

export interface AppConfig {
  siteBaseUrl: string
  cms: Config
  pages: Pages
  presets: Presets
  uploads: Uploads
  collections: Record<string, Collection>
  roles: Roles
  users: Users
  blocks: Block[]
  capabilities: string[]
  me: UserRecord
}

export interface Page extends PageRecord {
  draftToken: string
}

export interface Preview {
  id: number
  token: string
  data: Record<string, any>
  createdAt: string
  expiresAt: string
}

export interface Directory {
  id: number
  path: string
  name: string
  directoryId: number | null
  directory: Directory | null
  createdAt: string
  updatedAt: string
  uploads: UploadRecord[]
  directories: Directory[]
}

export interface Image {
  id: number
  path: string
  type: string
  optimization: string
  uploadId: number
  upload: UploadRecord
  createdAt: string
}

@Injectable()
export class ApiService {
  constructor(
    protected client: HttpClient,
    protected config: ConfigService,
    protected media: MediaService,
  ) {}

  /*
  |--------------------------------------------------------------------------
  | Auth
  |--------------------------------------------------------------------------
  |
  */

  login(email: string, password: string, remember: boolean) {
    return this.client.post<OAT>(`${this.config.apiBaseUrl}/login`, {
      email,
      password,
      remember,
    })
  }

  refreshToken() {
    return this.client.post<OAT>(`${this.config.apiBaseUrl}/refresh-token`, {})
  }

  logout() {
    return this.client.post<''>(`${this.config.apiBaseUrl}/logout`, {})
  }

  logoutFromOtherDevices() {
    return this.client.post<number>(`${this.config.apiBaseUrl}/logout-from-other-devices`, {})
  }

  /*
  |--------------------------------------------------------------------------
  | Config
  |--------------------------------------------------------------------------
  |
  */

  getHome() {
    return this.client.get<{ version: string; status: 'active' | 'blank' }>(this.config.apiBaseUrl)
  }

  getConfig() {
    return this.client.get<AppConfig>(`${this.config.apiBaseUrl}/config`)
  }

  flush() {
    return this.client.post<{ message: string }>(`${this.config.apiBaseUrl}/flush`, {})
  }

  install(email: string, password: string) {
    return this.client.post<OAT>(`${this.config.apiBaseUrl}/install`, {
      email,
      password,
    })
  }

  getIcons() {
    return this.client.get<{ icons: Record<string, string> }>(`${this.config.apiBaseUrl}/icons`)
  }

  /*
  |--------------------------------------------------------------------------
  | Settings
  |--------------------------------------------------------------------------
  |
  */

  getSettings() {
    return this.client.get<Settings[]>(`${this.config.apiBaseUrl}/settings`)
  }

  getSettingRaw(group: string, language: string) {
    return this.client.get<SettingRecord>(
      `${this.config.apiBaseUrl}/settings/${group}/raw?language=${language}`,
    )
  }

  getSettingConfig(group: string) {
    return this.client.get<Settings>(`${this.config.apiBaseUrl}/settings/${group}/config`)
  }

  getSettingDefaults(group: string, language: string) {
    return this.client.get<SettingRecord>(
      `${this.config.apiBaseUrl}/settings/${group}/defaults?language=${language}`,
    )
  }

  updateSetting(setting: SettingRecord) {
    return this.client.patch<SettingRecord>(
      `${this.config.apiBaseUrl}/settings/${setting.group}`,
      setting,
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Pages
  |--------------------------------------------------------------------------
  |
  */

  getPages(params: QueryStringParameters, silent: boolean = false) {
    if (this.config.can['readPages']) {
      const query = stringifyQueryParameters(params) + (silent ? '&silent' : '')
      return this.client.get<Index<Partial<Page>>>(`${this.config.apiBaseUrl}/pages?${query}`)
    }

    return of({
      data: [],
      meta: { total: 0, perPage: 0, currentPage: 1, lastPage: 1, firstPage: 1 },
    })
  }

  createPage(page: Partial<Page>) {
    return this.client.post<Partial<Page>>(`${this.config.apiBaseUrl}/pages`, page)
  }

  getPage(id: number | string, silent: boolean = false) {
    return this.client.get<Partial<Page>>(
      `${this.config.apiBaseUrl}/pages/${id}${silent ? '?silent' : ''}`,
    )
  }

  updatePage(page: Partial<Page>) {
    return this.client.patch<Partial<Page>>(`${this.config.apiBaseUrl}/pages/${page.id}`, page)
  }

  deletePage(page: Partial<Page>) {
    return this.client.delete<''>(`${this.config.apiBaseUrl}/pages/${page.id}`)
  }

  deletePages(ids: (string | number)[]) {
    return this.client.post<number>(`${this.config.apiBaseUrl}/delete-pages`, { ids })
  }

  getPageChoices(field: string, keywords: string, page: number = 1) {
    return this.client.get<Index<string>>(
      `${this.config.apiBaseUrl}/page-choices?field=${field}&keywords=${keywords}&page=${page}&silent`,
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Previews
  |--------------------------------------------------------------------------
  |
  */

  createPreview(preview: Partial<Preview>, type: 'page' | 'preset') {
    return this.client.post<Preview>(`${this.config.apiBaseUrl}/previews?type=${type}`, preview)
  }

  getPreview(token: string) {
    return this.client.get<Partial<Page>>(`${this.config.apiBaseUrl}/previews/${token}`)
  }

  updatePreview(preview: Partial<Preview>, type: 'page' | 'preset') {
    return this.client.patch<Preview>(
      `${this.config.apiBaseUrl}/previews/${preview.token}?type=${type}`,
      preview,
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Presets
  |--------------------------------------------------------------------------
  |
  */

  getPresets(params: QueryStringParameters, silent: boolean = false) {
    if (this.config.can['readPresets']) {
      const query = stringifyQueryParameters(params) + (silent ? '&silent' : '')
      return this.client.get<Index<Partial<PresetRecord>>>(
        `${this.config.apiBaseUrl}/presets?${query}`,
      )
    }

    return of({
      data: [],
      meta: { total: 0, perPage: 0, currentPage: 1, lastPage: 1, firstPage: 1 },
    })
  }

  createPreset(preset: Partial<PresetRecord>) {
    return this.client.post<Partial<PresetRecord>>(`${this.config.apiBaseUrl}/presets`, preset)
  }

  getPreset(id: number | string, silent: boolean = false) {
    return this.client.get<Partial<PresetRecord>>(
      `${this.config.apiBaseUrl}/presets/${id}${silent ? '?silent' : ''}`,
    )
  }

  getRelatedPagesOfPreset(presetId: number | string, page: number = 1) {
    return this.client.get<Index<Partial<Page>>>(
      `${this.config.apiBaseUrl}/presets/${presetId}/pages?page=${page}`,
    )
  }

  updatePreset(preset: Partial<PresetRecord>) {
    return this.client.patch<Partial<PresetRecord>>(
      `${this.config.apiBaseUrl}/presets/${preset.id}`,
      preset,
    )
  }

  deletePreset(preset: Partial<PresetRecord>) {
    return this.client.delete<''>(`${this.config.apiBaseUrl}/presets/${preset.id}`)
  }

  deletePresets(ids: (string | number)[]) {
    return this.client.post<number>(`${this.config.apiBaseUrl}/delete-presets`, { ids })
  }

  getPresetChoices(field: string, keywords: string, page: number = 1) {
    return this.client.get<Index<string>>(
      `${this.config.apiBaseUrl}/preset-choices?field=${field}&keywords=${keywords}&page=${page}&silent`,
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Blocks
  |--------------------------------------------------------------------------
  |
  */

  validateAllowedBlocks(blocks: BlockRecord[], allowedBlocks: string[], rootBlocks: string[]) {
    return this.client.post<{
      blocks: BlockRecord[]
      sanitized: BlockRecord[]
      errors: { blockId: string; message: string }[]
    }>(`${this.config.apiBaseUrl}/validate-allowed-blocks?silent`, {
      blocks,
      allowedBlocks,
      rootBlocks,
    })
  }

  /*
  |--------------------------------------------------------------------------
  | Redirects
  |--------------------------------------------------------------------------
  |
  */

  getRedirects() {
    return this.client.get<Redirect[]>(`${this.config.apiBaseUrl}/redirects`)
  }

  updateRedirects(redirects: Redirect[]) {
    return this.client.patch<Redirect[]>(`${this.config.apiBaseUrl}/redirects`, { redirects })
  }

  /*
  |--------------------------------------------------------------------------
  | Directories
  |--------------------------------------------------------------------------
  |
  */

  getDirectories() {
    if (this.config.can['readMedia']) {
      return this.client.get<Partial<Directory>[]>(`${this.config.apiBaseUrl}/directories`)
    }

    return of([])
  }

  getRootDirectories() {
    if (this.config.can['readMedia']) {
      return this.client.get<Partial<Directory>[]>(`${this.config.apiBaseUrl}/directories/root`)
    }

    return of([])
  }

  createDirectory(directory: Partial<Directory>) {
    return this.client.post<Partial<Directory>>(`${this.config.apiBaseUrl}/directories`, directory)
  }

  getDirectory(id: number | string) {
    return this.client.get<Partial<Directory>>(`${this.config.apiBaseUrl}/directories/${id}`)
  }

  getDirectoryByPath(path: string, silent: boolean = false) {
    return this.client.get<Partial<Directory>>(
      `${this.config.apiBaseUrl}/directories/path/${encodeURIComponent(path)}${
        silent ? '?silent' : ''
      }`,
    )
  }

  updateDirectory(directory: Partial<Directory>) {
    return this.client
      .patch<Partial<Directory>>(`${this.config.apiBaseUrl}/directories/${directory.id}`, directory)
      .pipe(tap(() => this.media.pathChanged$.next()))
  }

  deleteDirectory(directory: Partial<Directory>) {
    return this.client
      .delete<''>(`${this.config.apiBaseUrl}/directories/${directory.id}`)
      .pipe(tap(() => this.media.pathChanged$.next()))
  }

  /*
  |--------------------------------------------------------------------------
  | Uploads
  |--------------------------------------------------------------------------
  |
  */

  getUploads(params: QueryStringParameters, silent: boolean = false) {
    if (this.config.can['readMedia']) {
      const query = stringifyQueryParameters(params) + (silent ? '&silent' : '')
      return this.client.get<Index<Partial<UploadRecord>>>(
        `${this.config.apiBaseUrl}/uploads?${query}`,
      )
    }

    return of({
      data: [],
      meta: { total: 0, perPage: 0, currentPage: 1, lastPage: 1, firstPage: 1 },
    })
  }

  allUploads(params: QueryStringParameters, silent: boolean = false) {
    if (this.config.can['readMedia']) {
      const query = stringifyQueryParameters(params) + (silent ? '&silent' : '')
      return this.client.get<Partial<UploadRecord>[]>(
        `${this.config.apiBaseUrl}/all-uploads?${query}`,
      )
    }

    return of([])
  }

  createUpload(upload: Partial<UploadRecord>, file: File) {
    const formData = new FormData()

    Object.entries(upload)
      .filter(([_, value]) => value !== null && value !== undefined)
      .forEach(([key, value]) => {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value))
        } else {
          formData.append(key, value.toString())
        }
      })

    formData.append('file', file)

    return this.client.post<Partial<UploadRecord>>(`${this.config.apiBaseUrl}/uploads`, formData)
  }

  getUpload(id: number | string, silent: boolean = false): Observable<Partial<UploadRecord>> {
    if (this.config.can['readMedia']) {
      return this.client.get<Partial<UploadRecord>>(
        `${this.config.apiBaseUrl}/uploads/${id}${silent ? '?silent' : ''}`,
      )
    }

    return of({})
  }

  updateUpload(upload: Partial<UploadRecord>) {
    return this.client
      .patch<Partial<UploadRecord>>(`${this.config.apiBaseUrl}/uploads/${upload.id}`, upload)
      .pipe(tap(() => this.media.pathChanged$.next()))
  }

  deleteUpload(upload: Partial<UploadRecord>) {
    return this.client
      .delete<''>(`${this.config.apiBaseUrl}/uploads/${upload.id}`)
      .pipe(tap(() => this.media.pathChanged$.next()))
  }

  getUploadChoices(field: string, keywords: string, page: number = 1) {
    return this.client.get<Index<string>>(
      `${this.config.apiBaseUrl}/upload-choices?field=${field}&keywords=${keywords}&page=${page}&silent`,
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Media
  |--------------------------------------------------------------------------
  |
  */

  moveMedia(selection: MediaSelection, target: Partial<Directory>) {
    return this.client
      .post<{ items: number; moved: number }>(`${this.config.apiBaseUrl}/move-media`, {
        directories: Object.keys(selection.directories),
        uploads: Object.keys(selection.uploads),
        target: target.id,
      })
      .pipe(tap(() => this.media.pathChanged$.next()))
  }

  deleteMedia(selection: MediaSelection) {
    return this.client
      .post<''>(`${this.config.apiBaseUrl}/delete-media`, {
        directories: Object.keys(selection.directories),
        uploads: Object.keys(selection.uploads),
      })
      .pipe(tap(() => this.media.pathChanged$.next()))
  }

  /*
  |--------------------------------------------------------------------------
  | Collections
  |--------------------------------------------------------------------------
  |
  */

  getPosts(collection: string, params: QueryStringParameters, silent: boolean = false) {
    if (this.config.can[`readPosts:${collection}`]) {
      const query = stringifyQueryParameters(params) + (silent ? '&silent' : '')
      return this.client.get<Index<Partial<PostRecord>>>(
        `${this.config.apiBaseUrl}/collections/${collection}/posts?${query}`,
      )
    }

    return of({
      data: [],
      meta: { total: 0, perPage: 0, currentPage: 1, lastPage: 1, firstPage: 1 },
    })
  }

  createPost(collection: string, post: Partial<PostRecord>) {
    return this.client.post<Partial<PostRecord>>(
      `${this.config.apiBaseUrl}/collections/${collection}/posts`,
      post,
    )
  }

  getPost(collection: string, id: number | string, silent: boolean = false) {
    return this.client.get<Partial<PostRecord>>(
      `${this.config.apiBaseUrl}/collections/${collection}/posts/${id}${silent ? '?silent' : ''}`,
    )
  }

  updatePost(collection: string, post: Partial<PostRecord>) {
    return this.client.patch<Partial<PostRecord>>(
      `${this.config.apiBaseUrl}/collections/${collection}/posts/${post.id}`,
      post,
    )
  }

  deletePost(collection: string, post: Partial<PostRecord>) {
    return this.client.delete<''>(
      `${this.config.apiBaseUrl}/collections/${collection}/posts/${post.id}`,
    )
  }

  deletePosts(collection: string, ids: (string | number)[]) {
    return this.client.post<number>(
      `${this.config.apiBaseUrl}/collections/${collection}/delete-posts`,
      { ids },
    )
  }

  getPostChoices(collection: string, field: string, keywords: string, page: number = 1) {
    return this.client.get<Index<string>>(
      `${this.config.apiBaseUrl}/collections/${collection}/post-choices?field=${field}&keywords=${keywords}&page=${page}&silent`,
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Roles
  |--------------------------------------------------------------------------
  |
  */

  getRoles(params: QueryStringParameters, silent: boolean = false) {
    if (this.config.can['readRoles']) {
      const query = stringifyQueryParameters(params) + (silent ? '&silent' : '')
      return this.client.get<Index<Partial<RoleRecord>>>(`${this.config.apiBaseUrl}/roles?${query}`)
    }

    return of({
      data: [],
      meta: { total: 0, perPage: 0, currentPage: 1, lastPage: 1, firstPage: 1 },
    })
  }

  createRole(role: Partial<RoleRecord>) {
    return this.client.post<Partial<RoleRecord>>(`${this.config.apiBaseUrl}/roles`, role)
  }

  getRole(id: number | string, silent: boolean = false) {
    return this.client.get<Partial<RoleRecord>>(
      `${this.config.apiBaseUrl}/roles/${id}${silent ? '?silent' : ''}`,
    )
  }

  updateRole(role: Partial<RoleRecord>) {
    return this.client.patch<Partial<RoleRecord>>(
      `${this.config.apiBaseUrl}/roles/${role.id}`,
      role,
    )
  }

  deleteRole(role: Partial<RoleRecord>) {
    return this.client.delete<''>(`${this.config.apiBaseUrl}/roles/${role.id}`)
  }

  deleteRoles(ids: (string | number)[]) {
    return this.client.post<number>(`${this.config.apiBaseUrl}/delete-roles`, { ids })
  }

  getRoleChoices(field: string, keywords: string, page: number = 1) {
    return this.client.get<Index<string>>(
      `${this.config.apiBaseUrl}/role-choices?field=${field}&keywords=${keywords}&page=${page}&silent`,
    )
  }

  /*
  |--------------------------------------------------------------------------
  | Users
  |--------------------------------------------------------------------------
  |
  */

  getUsers(params: QueryStringParameters, silent: boolean = false) {
    if (this.config.can['readUsers']) {
      const query = stringifyQueryParameters(params) + (silent ? '&silent' : '')
      return this.client.get<Index<Partial<UserRecord>>>(`${this.config.apiBaseUrl}/users?${query}`)
    }

    return of({
      data: [],
      meta: { total: 0, perPage: 0, currentPage: 1, lastPage: 1, firstPage: 1 },
    })
  }

  createUser(user: Partial<UserRecord>) {
    return this.client.post<Partial<UserRecord>>(`${this.config.apiBaseUrl}/users`, user)
  }

  getUser(id: number | string, silent: boolean = false) {
    return this.client.get<Partial<UserRecord>>(
      `${this.config.apiBaseUrl}/users/${id}${silent ? '?silent' : ''}`,
    )
  }

  updateUser(user: Partial<UserRecord>) {
    return this.client.patch<Partial<UserRecord>>(
      `${this.config.apiBaseUrl}/users/${user.id}`,
      user,
    )
  }

  deleteUser(user: Partial<UserRecord>) {
    return this.client.delete<''>(`${this.config.apiBaseUrl}/users/${user.id}`)
  }

  deleteUsers(ids: (string | number)[]) {
    return this.client.post<number>(`${this.config.apiBaseUrl}/delete-users`, { ids })
  }

  getUserChoices(field: string, keywords: string, page: number = 1) {
    return this.client.get<Index<string>>(
      `${this.config.apiBaseUrl}/user-choices?field=${field}&keywords=${keywords}&page=${page}&silent`,
    )
  }

  logoutUser(userId: number) {
    return this.client.post<number>(`${this.config.apiBaseUrl}/users/${userId}/logout`, {})
  }

  /*
  |--------------------------------------------------------------------------
  | Profile
  |--------------------------------------------------------------------------
  |
  */

  updateProfile(user: Partial<UserRecord>) {
    return this.client.patch<UserRecord>(`${this.config.apiBaseUrl}/profile`, user)
  }
}
