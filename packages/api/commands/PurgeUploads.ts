import { BaseCommand } from '@adonisjs/core/build/standalone'
import { pruvDir } from 'App/helpers'
import fs from 'fs'
import path from 'path'

export default class RedisWipe extends BaseCommand {
  /**
   * Command name is used to run the command
   */
  public static commandName = 'purge:uploads'

  /**
   * Command description is displayed in the "help" output
   */
  public static description = 'Delete all uploads'

  public static settings = {
    /**
     * Set the following value to true, if you want to load the application
     * before running the command. Don't forget to call `node ace generate:manifest`
     * afterwards.
     */
    loadApp: true,

    /**
     * Set the following value to true, if you want this command to keep running until
     * you manually decide to exit the process. Don't forget to call
     * `node ace generate:manifest` afterwards.
     */
    stayAlive: false,
  }

  public async run() {
    if (fs.existsSync(path.resolve(pruvDir(), 'uploads'))) {
      fs.rmSync(path.resolve(pruvDir(), 'uploads'), { recursive: true })
      this.logger.success('Deleted uploads successfully')
    }
  }
}
