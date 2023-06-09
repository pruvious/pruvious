import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'upload_meta'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('mid').primary()
      table
        .integer('upload_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('uploads')
        .onDelete('CASCADE')
      table.string('key', 255).notNullable().index()
      table.unique(['upload_id', 'key'])
      table.text('value').index()
      table.boolean('json')
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
