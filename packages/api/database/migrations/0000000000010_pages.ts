import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'pages'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.boolean('public').notNullable().index()
      table.text('path').notNullable().unique()
      table.string('language', 16).notNullable().index()
      table
        .integer('translation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('translations')
        .onDelete('RESTRICT')
      table.text('title').notNullable()
      table.boolean('base_title').notNullable()
      table.text('description').notNullable()
      table.boolean('visible').notNullable().index()
      table.integer('sharing_image').unsigned()
      table.json('meta_tags').notNullable()
      table.string('type', 255).notNullable().index()
      table.string('layout', 255).notNullable()
      table.json('blocks').notNullable()
      table.json('blocks_backup')
      table.text('cache')
      table.text('_keywords')
      table.string('draft_token', 21).notNullable().unique()
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
