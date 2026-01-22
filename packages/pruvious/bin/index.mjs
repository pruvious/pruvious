#!/usr/bin/env node
import { consola } from 'consola'
import { colors } from 'consola/utils'

consola.box(
  [
    `The ${colors.yellow('npx pruvious')} command has been deprecated.`,
    '',
    'Please use these commands instead:',
    `- For new projects: ${colors.cyan('npm create pruvious')}`,
    `- To install Pruvious Hub: ${colors.cyan('npx @pruvious/hub install')}`,
    `- For Pruvious v3 projects: ${colors.cyan('npx pruvious@3 init')}`,
  ].join('\n'),
)
