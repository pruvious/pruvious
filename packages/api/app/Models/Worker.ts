import { BaseModel, beforeCreate, column } from '@ioc:Adonis/Lucid/Orm'
import { nanoid } from '@pruvious-test/shared'
import { DateTime } from 'luxon'

export default class Worker extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column()
  public primary: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @beforeCreate()
  public static async beforeCreate(worker: Worker) {
    do {
      worker.name = nanoid()
    } while (await Worker.findBy('name', worker.name))
  }
}
