import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Page from 'App/Models/Page'

export default class extends BaseSeeder {
  public async run() {
    await Page.createMany([])
  }
}
