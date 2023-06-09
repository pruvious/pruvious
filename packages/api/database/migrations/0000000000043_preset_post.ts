import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'preset_post'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .integer('preset_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('presets')
        .onDelete('CASCADE')
      table
        .integer('post_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('posts')
        .onDelete('CASCADE')
      table.unique(['preset_id', 'post_id'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
