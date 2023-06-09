import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'post_meta'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('mid').primary()
      table
        .integer('post_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('posts')
        .onDelete('CASCADE')
      table.string('key', 255).notNullable().index()
      table.unique(['post_id', 'key'])
      table.text('value').index()
      table.boolean('json')
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
