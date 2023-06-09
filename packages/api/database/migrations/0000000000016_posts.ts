import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('collection', 255).notNullable().index()
      table.boolean('public').notNullable().index()
      table.string('language', 16).notNullable().index()
      table
        .integer('translation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('translations')
        .onDelete('RESTRICT')
      table.text('_keywords')
      table.timestamp('publish_date', { useTz: true }).index()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.timestamp('checked_at', { useTz: true }).notNullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
