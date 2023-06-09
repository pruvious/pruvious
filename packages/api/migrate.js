#!/usr/bin/env node

require('reflect-metadata')
require('source-map-support').install({ handleUncaughtExceptions: false })

const { Ignitor } = require('@adonisjs/core/build/standalone')
new Ignitor(__dirname).ace().handle(['migration:run', '--force'])
