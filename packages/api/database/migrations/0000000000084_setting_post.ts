import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'setting_post'

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
        .integer('post_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('posts')
        .onDelete('CASCADE')
      table.unique(['setting_id', 'post_id'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
