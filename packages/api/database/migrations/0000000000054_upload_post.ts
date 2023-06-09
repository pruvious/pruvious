import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'upload_post'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .integer('upload_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('uploads')
        .onDelete('CASCADE')
      table
        .integer('post_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('posts')
        .onDelete('CASCADE')
      table.unique(['upload_id', 'post_id'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
