import { randomString } from '@pruvious/utils'
import fs from 'fs-extra'

/*
|--------------------------------------------------------------------------
| Ensure SQLite database
|--------------------------------------------------------------------------
|
*/

if (!fs.existsSync('packages/api/database.sqlite3')) {
  fs.copySync('packages/create/stubs/database.sqlite3.txt', 'packages/api/database.sqlite3')
}

/*
|--------------------------------------------------------------------------
| Ensure .env
|--------------------------------------------------------------------------
|
*/

if (!fs.existsSync('packages/api/.env')) {
  const stub = fs.readFileSync('packages/api/.env.example', 'utf-8')

  fs.writeFileSync(
    'packages/api/.env',
    stub.replace(
      'NODE_ENV=production',
      'NODE_ENV=development',
      'APP_KEY="node ace generate:key"',
      `APP_KEY=${randomString(32)}`,
    ),
  )
}
