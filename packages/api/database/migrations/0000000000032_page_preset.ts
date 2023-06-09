import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'page_preset'

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
        .integer('preset_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('presets')
        .onDelete('CASCADE')
      table.unique(['page_id', 'preset_id'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
