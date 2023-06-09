import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('email', 255).notNullable().unique()
      table.string('password', 180).notNullable()
      table.integer('role').unsigned().references('id').inTable('roles').onDelete('SET NULL')
      table.json('capabilities').notNullable()
      table.string('date_format', 255).notNullable()
      table.string('time_format', 255).notNullable()
      table.boolean('is_admin').notNullable().defaultTo(false)
      table.text('_keywords')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.timestamp('checked_at', { useTz: true }).notNullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
