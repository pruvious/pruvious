/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Application from '@ioc:Adonis/Core/Application'
import Env from '@ioc:Adonis/Core/Env'
import Route, { RouteParamMatcher } from '@ioc:Adonis/Core/Route'
import Database from '@ioc:Adonis/Lucid/Database'
import fs from 'fs'
import path from 'path'

const subdir = new URL(Env.get('CMS_BASE_URL')).pathname.replace(/^\//, '').replace(/\/*$/, '')

/*
|--------------------------------------------------------------------------
| Matchers
|--------------------------------------------------------------------------
|
*/

const MatchAndCastId: RouteParamMatcher = {
  match: /^[1-9][0-9]*$/,
  cast: (id) => Number(id),
}

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
|
*/

Route.group(() => {
  /**
   * Home
   */
  Route.get('/', async () => ({
    version: Application.version?.version,
    status: (await Database.from('users').count('id', 'count').exec())[0]['count']
      ? 'active'
      : 'blank',
  }))

  /**
   * Install
   */
  Route.post('/install', 'ConfigController.install').middleware('blank')

  /**
   * Auth
   */
  Route.post('/login', 'AuthController.login').middleware('guest')
  Route.post('/refresh-token', 'AuthController.refreshToken').middleware('auth')
  Route.post('/logout', 'AuthController.logout').middleware('auth')
  Route.post('/logout-from-other-devices', 'AuthController.logoutFromOtherDevices').middleware(
    'auth',
  )

  /**
   * App
   */
  Route.group(() => {
    Route.get('/config', 'ConfigController.config')
    Route.post('/flush', 'ConfigController.flush')
    Route.get('/icons', 'ConfigController.icons')

    Route.get('/pages', 'PagesController.index').middleware('pagesEnabled')
    Route.post('/pages', 'PagesController.store').middleware('pagesEnabled')
    Route.get('/pages/:id', 'PagesController.show').middleware('pagesEnabled')
    Route.patch('/pages/:id', 'PagesController.update').middleware('pagesEnabled')
    Route.delete('/pages/:id', 'PagesController.destroy').middleware('pagesEnabled')
    Route.post('/delete-pages', 'PagesController.destroyMany').middleware('pagesEnabled')
    Route.get('/page-choices', 'PagesController.choices').middleware('pagesEnabled')

    Route.get('/presets', 'PresetsController.index').middleware('presetsEnabled')
    Route.post('/presets', 'PresetsController.store').middleware('presetsEnabled')
    Route.get('/presets/:id', 'PresetsController.show').middleware('presetsEnabled')
    Route.get('/presets/:id/pages', 'PresetsController.relatedPages').middleware([
      'presetsEnabled',
      'pagesEnabled',
    ])
    Route.patch('/presets/:id', 'PresetsController.update').middleware('presetsEnabled')
    Route.delete('/presets/:id', 'PresetsController.destroy').middleware('presetsEnabled')
    Route.post('/delete-presets', 'PresetsController.destroyMany').middleware('presetsEnabled')
    Route.get('/preset-choices', 'PresetsController.choices').middleware('presetsEnabled')

    Route.post('/validate-allowed-blocks', 'BlocksController.validateAllowedBlocks')

    Route.get('/redirects', 'RedirectsController.show').middleware('pagesEnabled')
    Route.patch('/redirects', 'RedirectsController.update').middleware('pagesEnabled')

    Route.get('/directories', 'DirectoriesController.index')
    Route.get('/directories/root', 'DirectoriesController.indexRoot')
    Route.post('/directories', 'DirectoriesController.store')
    Route.get('/directories/:id', 'DirectoriesController.show')
    Route.get('/directories/path/:path', 'DirectoriesController.showByPath')
    Route.patch('/directories/:id', 'DirectoriesController.update')
    Route.delete('/directories/:id', 'DirectoriesController.destroy')

    Route.get('/uploads', 'UploadsController.index').middleware('uploadsEnabled')
    Route.get('/all-uploads', 'UploadsController.all').middleware('uploadsEnabled')
    Route.post('/uploads', 'UploadsController.store').middleware('uploadsEnabled')
    Route.get('/uploads/:id', 'UploadsController.show').middleware('uploadsEnabled')
    Route.patch('/uploads/:id', 'UploadsController.update').middleware('uploadsEnabled')
    Route.delete('/uploads/:id', 'UploadsController.destroy').middleware('uploadsEnabled')
    Route.get('/upload-choices', 'UploadsController.choices').middleware('uploadsEnabled')

    Route.post('/move-media', 'MediaController.move').middleware('uploadsEnabled')
    Route.post('/delete-media', 'MediaController.destroy').middleware('uploadsEnabled')

    Route.get('/collections/:collection/posts', 'PostsController.index').middleware(
      'collectionExists',
    )
    Route.post('/collections/:collection/posts', 'PostsController.store').middleware(
      'collectionExists',
    )
    Route.get('/collections/:collection/posts/:id', 'PostsController.show').middleware(
      'collectionExists',
    )
    Route.patch('/collections/:collection/posts/:id', 'PostsController.update').middleware(
      'collectionExists',
    )
    Route.delete('/collections/:collection/posts/:id', 'PostsController.destroy').middleware(
      'collectionExists',
    )
    Route.post('/collections/:collection/delete-posts', 'PostsController.destroyMany').middleware(
      'collectionExists',
    )
    Route.get('/collections/:collection/post-choices', 'PostsController.choices').middleware(
      'collectionExists',
    )

    Route.get('/roles', 'RolesController.index')
    Route.post('/roles', 'RolesController.store')
    Route.get('/roles/:id', 'RolesController.show')
    Route.get('/roles/:id/users', 'RolesController.showUsers')
    Route.patch('/roles/:id', 'RolesController.update')
    Route.delete('/roles/:id', 'RolesController.destroy')
    Route.post('/delete-roles', 'RolesController.destroyMany')
    Route.get('/role-choices', 'RolesController.choices')

    Route.get('/users', 'UsersController.index')
    Route.post('/users', 'UsersController.store')
    Route.get('/users/:id', 'UsersController.show')
    Route.patch('/users/:id', 'UsersController.update')
    Route.delete('/users/:id', 'UsersController.destroy')
    Route.post('/delete-users', 'UsersController.destroyMany')
    Route.get('/user-choices', 'UsersController.choices')
    Route.post('/users/:id/logout', 'UsersController.logout')

    Route.patch('/profile', 'ProfileController.update')
  }).middleware('auth')

  Route.get('/blocks', 'ConfigController.blocks')
  Route.get('/languages', 'ConfigController.languages')

  Route.get('/path', 'PathController.show').middleware('pagesEnabled')
  Route.get('/path/*', 'PathController.show').middleware('pagesEnabled')

  Route.post('/previews', 'PreviewsController.store').middleware('auth')
  Route.get('/previews/:token', 'PreviewsController.show')
  Route.patch('/previews/:token', 'PreviewsController.update').middleware('auth')

  Route.get('/settings', 'SettingsController.index').middleware('auth')
  Route.get('/settings/:group', 'SettingsController.show')
  Route.get('/settings/:group/raw', 'SettingsController.showRaw').middleware('auth')
  Route.get('/settings/:group/config', 'SettingsController.showConfig').middleware('auth')
  Route.get('/settings/:group/defaults', 'SettingsController.showDefaults').middleware('auth')
  Route.patch('/settings/:group', 'SettingsController.update').middleware('auth')

  Route.get('/actions/:name', 'ActionsController.query')
  Route.post('/actions/:name', 'ActionsController.query')
  Route.patch('/actions/:name', 'ActionsController.query')
  Route.put('/actions/:name', 'ActionsController.query')
  Route.delete('/actions/:name', 'ActionsController.query')

  Route.get('/robots', 'SEOController.robots').middleware('seoEnabled')
  Route.get('/sitemap', 'SEOController.sitemap').middleware('seoEnabled')
  Route.get('/sitemap/:index', 'SEOController.sitemap').middleware('seoEnabled')
})
  .prefix('/api')
  .where('id', MatchAndCastId)

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
|
*/

const indexPath = path.resolve(__dirname, '../public/.index.html')
const index = fs.existsSync(indexPath)
  ? fs
      .readFileSync(indexPath, 'utf-8')
      .replace('base href="/"', `base href="${subdir ? '/' + subdir + '/' : '/'}"`)
      .replace('http://localhost:3333', Env.get('CMS_BASE_URL').replace(/\/*$/, ''))
      .replace('assets/images/favicon.svg', Env.get('APP_FAVICON_SVG', 'assets/images/favicon.svg'))
      .replace('assets/images/favicon.png', Env.get('APP_FAVICON_PNG', 'assets/images/favicon.png'))
      .replace('assets/images/logo.svg', Env.get('APP_LOGO', 'assets/images/logo.svg'))
      .replace(
        'assets/images/logo-login.svg',
        Env.get('APP_LOGO_LOGIN', 'assets/images/logo-login.svg'),
      )
      .replace('<title>Pruvious</title>', '<title>' + Env.get('APP_TITLE', 'Pruvious') + '</title>')
  : null

if (index) {
  Route.get('*', () => index)
}
