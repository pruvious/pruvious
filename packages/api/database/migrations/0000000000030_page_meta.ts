import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'page_meta'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('mid').primary()
      table
        .integer('page_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('pages')
        .onDelete('CASCADE')
      table.string('key', 255).notNullable().index()
      table.unique(['page_id', 'key'])
      table.text('value').index()
      table.boolean('json')
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
