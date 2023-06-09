import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'presets'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('language', 16).notNullable().index()
      table
        .integer('translation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('translations')
        .onDelete('RESTRICT')
      table.text('title').index()
      table.unique(['title', 'language'])
      table.json('blocks').notNullable()
      table.json('blocks_backup')
      table.text('_keywords')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.timestamp('checked_at', { useTz: true }).notNullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
