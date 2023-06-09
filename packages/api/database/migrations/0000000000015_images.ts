import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'images'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.text('path')
      table.string('format', 4)
      table.integer('width')
      table.integer('height')
      table.string('resize', 16)
      table.string('position', 16)
      table.string('interpolation', 16)
      table.integer('quality')
      table.integer('alpha_quality')
      table.boolean('lossless')
      table.boolean('near_lossless')
      table.boolean('smart_subsample')
      table.json('info').notNullable()
      table
        .integer('upload_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('uploads')
        .onDelete('RESTRICT')
      table.timestamp('created_at', { useTz: true }).notNullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
