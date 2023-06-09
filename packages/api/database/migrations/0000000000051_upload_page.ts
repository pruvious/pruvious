import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'upload_page'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .integer('upload_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('uploads')
        .onDelete('CASCADE')
      table
        .integer('page_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('pages')
        .onDelete('CASCADE')
      table.unique(['upload_id', 'page_id'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
