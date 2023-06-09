import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import { createRole } from 'App/RoleQuery'

export default class extends BaseSeeder {
  public async run() {
    await createRole({
      name: 'Editor',
      capabilities: [
        'accessDashboard',
        'createMedia',
        'createPages',
        'createPresets',
        'deleteMedia',
        'deletePages',
        'deletePresets',
        'listCollections',
        'listSettings',
        'login',
        'readRedirects',
        'updateRedirects',
        'readSEOSettings',
        'updateSEOSettings',
        'readMedia',
        'readPages',
        'readPresets',
        'updateMedia',
        'updatePages',
        'updatePresets',
        'updateProfile',
      ],
    })

    await createRole({
      name: 'Author',
      capabilities: [
        'accessDashboard',
        'createMedia',
        'createPages',
        'createPresets',
        'listCollections',
        'listSettings',
        'login',
        'readRedirects',
        'readSEOSettings',
        'readMedia',
        'readPages',
        'readPresets',
        'updateMedia',
        'updatePages',
        'updatePresets',
        'updateProfile',
      ],
    })

    await createRole({
      name: 'User',
      capabilities: ['login', 'updateProfile'],
    })
  }
}
