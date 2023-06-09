import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import { createUser } from 'App/UserQuery'

export default class extends BaseSeeder {
  public async run() {
    if (!process.argv.includes('--production')) {
      await createUser({
        firstName: 'Pruvious',
        lastName: 'Admin',
        email: 'admin@pruvious.com',
        password: '12345678',
        isAdmin: true,
      })
    }
  }
}
