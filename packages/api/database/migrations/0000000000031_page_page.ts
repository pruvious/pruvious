import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'page_page'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .integer('page_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('pages')
        .onDelete('CASCADE')
      table
        .integer('related_page_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('pages')
        .onDelete('CASCADE')
      table.unique(['page_id', 'related_page_id'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
