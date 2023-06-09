import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'directories'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.text('path').index()
      table.string('name', 255).notNullable().index()
      table
        .integer('directory_id')
        .unsigned()
        .references('id')
        .inTable('directories')
        .onDelete('RESTRICT')
      table.unique(['name', 'directory_id'])
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
