#!/usr/bin/env node

/*
|--------------------------------------------------------------------------
| AdonisJs Server
|--------------------------------------------------------------------------
|
| The contents in this file is meant to bootstrap the AdonisJs application
| and start the HTTP server to accept incoming connections. You must avoid
| making this file dirty and instead make use of `lifecycle hooks` provided
| by AdonisJs service providers for custom code.
|
*/

import { Ignitor } from '@adonisjs/core/build/standalone'
import dotenv from 'dotenv'
import path from 'path'
import 'reflect-metadata'
import sourceMapSupport from 'source-map-support'

console.clear()

if (process.env.PRUVIOUS_OUTPUT_DIR) {
  dotenv.config({ path: path.resolve(process.env.PRUVIOUS_OUTPUT_DIR, '../.env') })
} else {
  dotenv.config()
}

sourceMapSupport.install({ handleUncaughtExceptions: false })

new Ignitor(__dirname).httpServer().start()
