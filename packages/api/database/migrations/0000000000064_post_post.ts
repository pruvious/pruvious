import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'post_post'

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
        .integer('related_post_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('posts')
        .onDelete('CASCADE')
      table.unique(['post_id', 'related_post_id'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
