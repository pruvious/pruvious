/*
|--------------------------------------------------------------------------
| Validating Environment Variables
|--------------------------------------------------------------------------
|
| In this file we define the rules for validating environment variables.
| By performing validation we ensure that your application is running in
| a stable environment with correct configuration values.
|
| This file is read automatically by the framework during the boot lifecycle
| and hence do not rename or move this file to a different location.
|
*/

import Env from '@ioc:Adonis/Core/Env'

export default Env.rules({
  HOST: Env.schema.string({ format: 'host' }),
  PORT: Env.schema.number(),
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),

  APP_KEY: Env.schema.string(),
  APP_NAME: Env.schema.string(),
  APP_TITLE: Env.schema.string(),
  APP_FAVICON_SVG: Env.schema.string(),
  APP_FAVICON_PNG: Env.schema.string(),
  APP_LOGO: Env.schema.string(),
  APP_LOGO_LOGIN: Env.schema.string(),

  HEARTBEAT: Env.schema.string(),
  FLUSH_INTERVAL: Env.schema.string(),

  CMS_BASE_URL: Env.schema.string(),
  SITE_BASE_URL: Env.schema.string(),
  TRAILING_SLASH: Env.schema.boolean(),

  OAT_EXPIRES_IN: Env.schema.string(),
  OAT_EXPIRES_IN_LONG: Env.schema.string(),

  DB_CONNECTION: Env.schema.enum(['pg', 'sqlite'] as const),

  PG_HOST: Env.schema.string({ format: 'host' }),
  PG_PORT: Env.schema.number(),
  PG_USER: Env.schema.string(),
  PG_PASSWORD: Env.schema.string.optional(),
  PG_DB_NAME: Env.schema.string(),
  PG_SSL: Env.schema.boolean(),

  DRIVE_DISK: Env.schema.enum(['local'] as const),
})
