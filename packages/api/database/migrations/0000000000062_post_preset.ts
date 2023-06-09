import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'post_preset'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .integer('post_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('posts')
        .onDelete('CASCADE')
      table
        .integer('preset_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('presets')
        .onDelete('CASCADE')
      table.unique(['post_id', 'preset_id'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
