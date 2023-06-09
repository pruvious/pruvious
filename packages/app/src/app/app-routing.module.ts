import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { InstallComponent } from 'src/app/components/install/install.component'
import { BaseLayoutComponent } from 'src/app/components/layouts/base-layout/base-layout.component'
import { DefaultLayoutComponent } from 'src/app/components/layouts/default-layout/default-layout.component'
import { LoginComponent } from 'src/app/components/login/login.component'
import { LogoutComponent } from 'src/app/components/pages/logout/logout.component'
import { MediaComponent } from 'src/app/components/pages/media/media.component'
import { PageComponent } from 'src/app/components/pages/page/page.component'
import { PagesComponent } from 'src/app/components/pages/pages/pages.component'
import { PostComponent } from 'src/app/components/pages/post/post.component'
import { PostsComponent } from 'src/app/components/pages/posts/posts.component'
import { PresetComponent } from 'src/app/components/pages/preset/preset.component'
import { PresetsComponent } from 'src/app/components/pages/presets/presets.component'
import { ProfileComponent } from 'src/app/components/pages/profile/profile.component'
import { RedirectsComponent } from 'src/app/components/pages/redirects/redirects.component'
import { RoleComponent } from 'src/app/components/pages/role/role.component'
import { RolesComponent } from 'src/app/components/pages/roles/roles.component'
import { SettingComponent } from 'src/app/components/pages/setting/setting.component'
import { UserComponent } from 'src/app/components/pages/user/user.component'
import { UsersComponent } from 'src/app/components/pages/users/users.component'
import { AuthGuard } from 'src/app/guards/auth.guard'
import { GuestGuard } from 'src/app/guards/guest.guard'
import { UnsavedGuard } from 'src/app/guards/unsaved.guard'
import { CollectionResolver } from 'src/app/resolvers/collection.resolver'
import { ConfigResolver } from 'src/app/resolvers/config.resolver'
import { CreatePageResolver } from 'src/app/resolvers/create-page.resolver'
import { CreatePostResolver } from 'src/app/resolvers/create-post.resolver'
import { CreatePresetResolver } from 'src/app/resolvers/create-preset.resolver'
import { CreateRoleResolver } from 'src/app/resolvers/create-role.resolver'
import { CreateUserResolver } from 'src/app/resolvers/create-user.resolver'
import { DirectoriesResolver } from 'src/app/resolvers/directories.resolver'
import { DirectoryResolver } from 'src/app/resolvers/directory.resolver'
import { HomeResolver } from 'src/app/resolvers/home.resolver'
import { PageResolver } from 'src/app/resolvers/page.resolver'
import { PagesResolver } from 'src/app/resolvers/pages.resolver'
import { PostResolver } from 'src/app/resolvers/post.resolver'
import { PresetResolver } from 'src/app/resolvers/preset.resolver'
import { PreviewResolver } from 'src/app/resolvers/preview.resolver'
import { RedirectsResolver } from 'src/app/resolvers/redirects.resolver'
import { RefreshTokenResolver } from 'src/app/resolvers/refresh-token.resolver'
import { RoleResolver } from 'src/app/resolvers/role.resolver'
import { SettingConfigResolver } from 'src/app/resolvers/setting-config.resolver'
import { SettingResolver } from 'src/app/resolvers/setting.resolver'
import { SettingsResolver } from 'src/app/resolvers/settings.resolver'
import { UploadResolver } from 'src/app/resolvers/upload.resolver'
import { UploadsResolver } from 'src/app/resolvers/uploads.resolver'
import { UserResolver } from 'src/app/resolvers/user.resolver'

const routes: Routes = [
  {
    path: '',
    resolve: {
      oat: HomeResolver,
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'pages',
      },
      { path: 'logged-in-redirect', pathMatch: 'full', redirectTo: 'pages' },
      {
        path: '',
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        component: BaseLayoutComponent,
        resolve: {
          oat: RefreshTokenResolver,
        },
        children: [
          {
            path: '',
            resolve: {
              config: ConfigResolver,
            },
            children: [
              {
                path: '',
                resolve: {
                  settings: SettingsResolver,
                },
                children: [
                  {
                    path: '',
                    component: DefaultLayoutComponent,
                    children: [
                      {
                        path: 'pages',
                        component: PagesComponent,
                        resolve: {
                          _: PagesResolver,
                        },
                      },
                      {
                        path: 'presets',
                        component: PresetsComponent,
                      },
                      {
                        path: 'media',
                        children: [
                          {
                            path: '',
                            component: MediaComponent,
                            resolve: {
                              directories: DirectoriesResolver,
                              uploads: UploadsResolver,
                            },
                          },
                          {
                            path: 'directories/:id',
                            component: MediaComponent,
                            resolve: {
                              directory: DirectoryResolver,
                            },
                          },
                          {
                            path: 'uploads/:id',
                            component: MediaComponent,
                            resolve: {
                              upload: UploadResolver,
                              directories: DirectoriesResolver,
                              uploads: UploadsResolver,
                            },
                          },
                        ],
                      },
                      {
                        path: 'collections/:collection/posts',
                        component: PostsComponent,
                        resolve: {
                          collection: CollectionResolver,
                        },
                      },
                      {
                        path: 'collections/:collection/posts/create',
                        canDeactivate: [UnsavedGuard],
                        resolve: {
                          collection: CollectionResolver,
                          _: CreatePostResolver,
                        },
                        component: PostComponent,
                      },
                      {
                        path: 'collections/:collection/posts/:id',
                        resolve: {
                          collection: CollectionResolver,
                          post: PostResolver,
                        },
                        children: [
                          {
                            path: '',
                            canDeactivate: [UnsavedGuard],
                            component: PostComponent,
                          },
                        ],
                      },
                      {
                        path: 'roles',
                        component: RolesComponent,
                      },
                      {
                        path: 'roles/create',
                        canDeactivate: [UnsavedGuard],
                        resolve: {
                          _: CreateRoleResolver,
                        },
                        component: RoleComponent,
                      },
                      {
                        path: 'roles/:id',
                        resolve: {
                          role: RoleResolver,
                        },
                        children: [
                          {
                            path: '',
                            canDeactivate: [UnsavedGuard],
                            component: RoleComponent,
                          },
                        ],
                      },
                      {
                        path: 'users',
                        component: UsersComponent,
                      },
                      {
                        path: 'users/create',
                        canDeactivate: [UnsavedGuard],
                        resolve: {
                          _: CreateUserResolver,
                        },
                        component: UserComponent,
                      },
                      {
                        path: 'users/:id',
                        resolve: {
                          user: UserResolver,
                        },
                        children: [
                          {
                            path: '',
                            canDeactivate: [UnsavedGuard],
                            component: UserComponent,
                          },
                        ],
                      },
                      {
                        path: 'redirection',
                        canDeactivate: [UnsavedGuard],
                        resolve: {
                          redirects: RedirectsResolver,
                        },
                        component: RedirectsComponent,
                      },
                      {
                        path: 'settings/:name',
                        resolve: {
                          settingConfig: SettingConfigResolver,
                          setting: SettingResolver,
                        },
                        canDeactivate: [UnsavedGuard],
                        component: SettingComponent,
                      },
                      {
                        path: 'profile',
                        canDeactivate: [UnsavedGuard],
                        component: ProfileComponent,
                      },
                    ],
                  },
                  {
                    path: 'pages/create',
                    resolve: {
                      _: PagesResolver,
                      __: CreatePageResolver,
                      preview: PreviewResolver,
                    },
                    canDeactivate: [UnsavedGuard],
                    component: PageComponent,
                  },
                  {
                    path: 'pages/:id',
                    resolve: {
                      _: PagesResolver,
                      page: PageResolver,
                    },
                    children: [
                      {
                        path: '',
                        resolve: {
                          preview: PreviewResolver,
                        },
                        canDeactivate: [UnsavedGuard],
                        component: PageComponent,
                      },
                    ],
                  },
                  {
                    path: 'presets/create',
                    resolve: {
                      __: CreatePresetResolver,
                      preview: PreviewResolver,
                    },
                    canDeactivate: [UnsavedGuard],
                    component: PresetComponent,
                  },
                  {
                    path: 'presets/:id',
                    resolve: {
                      preset: PresetResolver,
                    },
                    children: [
                      {
                        path: '',
                        resolve: {
                          preview: PreviewResolver,
                        },
                        canDeactivate: [UnsavedGuard],
                        component: PresetComponent,
                      },
                    ],
                  },
                  {
                    path: 'logout',
                    component: LogoutComponent,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: '',
        canActivate: [GuestGuard],
        canActivateChild: [GuestGuard],
        children: [
          {
            path: 'login',
            component: LoginComponent,
          },
        ],
      },
      {
        path: 'install',
        component: InstallComponent,
      },
      { path: '**', redirectTo: '/pages' },
    ],
  },
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
