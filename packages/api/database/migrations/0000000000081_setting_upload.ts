import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'setting_upload'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .integer('setting_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('settings')
        .onDelete('CASCADE')
      table
        .integer('upload_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('uploads')
        .onDelete('CASCADE')
      table.unique(['setting_id', 'upload_id'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
