import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'sitemaps'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('index').notNullable().index()
      table.text('xml').notNullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
