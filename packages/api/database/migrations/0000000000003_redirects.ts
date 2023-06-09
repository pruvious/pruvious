import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'redirects'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.text('match').notNullable()
      table.text('redirect_to').notNullable()
      table.boolean('is_regex').notNullable()
      table.boolean('is_permanent').notNullable()
      table.integer('order').unsigned().notNullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
