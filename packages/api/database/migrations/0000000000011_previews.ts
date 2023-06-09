import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'previews'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('token', 21).notNullable().unique()
      table.json('data').notNullable()
      table.text('_keywords')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
