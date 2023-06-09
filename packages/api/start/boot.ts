/*
|--------------------------------------------------------------------------
| Preloaded File
|--------------------------------------------------------------------------
|
| Any code written inside this file will be executed during the application
| boot.
|
*/

import Database from '@ioc:Adonis/Lucid/Database'
import { BaseModel } from '@ioc:Adonis/Lucid/Orm'
import {
  BlockFactory,
  CollectionFactory,
  ConfigFactory,
  SettingFactory,
  Validator,
} from '@pruvious-test/shared'
import { camelToLabel, camelize, lowercaseFirstLetter, mergeDeep } from '@pruvious-test/utils'
import { Action } from 'App/Controllers/Http/ActionsController'
import { CamelCaseNamingStrategy } from 'App/Strategies/CamelCaseNaming'
import {
  applyFieldStubs,
  importFile,
  importFiles,
  importIcons,
  onImport,
  validateActionConfig,
  validateBlock,
  validateCollectionConfig,
  validateConfig,
  validateCustomFields,
  validatePageConfig,
  validatePresetConfig,
  validateRoleConfig,
  validateSettingConfig,
  validateUploadConfig,
  validateUserConfig,
  validateValidatorConfig,
} from 'App/importer'
import {
  actions,
  blocks,
  collectionsConfig,
  config,
  pageConfig,
  presetConfig,
  roleConfig,
  settingConfigs,
  uploadConfig,
  userConfig,
  validators,
} from 'App/imports'
import path from 'path'
import sharp from 'sharp'

/*
|--------------------------------------------------------------------------
| Global settings
|--------------------------------------------------------------------------
|
*/

sharp.cache(false)

/*
|--------------------------------------------------------------------------
| Naming strategy
|--------------------------------------------------------------------------
|
*/

const namingStrategy = new CamelCaseNamingStrategy()
BaseModel.namingStrategy = namingStrategy
Database.SimplePaginator.namingStrategy = namingStrategy

/*
|--------------------------------------------------------------------------
| Imports
|--------------------------------------------------------------------------
|
*/

importFile('pruvious.config').then(async (factory: ConfigFactory) => {
  if (factory) {
    Object.assign(config, await factory())

    if (!config.defaultLanguage) {
      config.defaultLanguage = config.languages ? config.languages[0].code : undefined
    }

    validateConfig()

    if (config.pages) {
      applyFieldStubs(config.pages.fields)
      mergeDeep(pageConfig, config.pages)
      delete config.pages
      validatePageConfig()
    }

    if (config.presets) {
      mergeDeep(presetConfig, config.presets)
      delete config.presets
      validatePresetConfig()
    }

    if (config.uploads) {
      applyFieldStubs(config.uploads.fields)
      mergeDeep(uploadConfig, config.uploads)
      delete config.uploads
      validateUploadConfig()
    }

    if (config.roles) {
      mergeDeep(roleConfig, config.roles)
      delete config.roles
      validateRoleConfig()
    }

    if (config.users) {
      applyFieldStubs(config.users.fields)
      mergeDeep(userConfig, config.users)
      delete config.users
      validateUserConfig()
    }
  }

  const _actions: Action[] = await importFiles('actions')
  const blockFactories: BlockFactory[] = await importFiles('blocks')
  const collectionFactories: CollectionFactory[] = await importFiles('collections')
  const settingFactories: SettingFactory[] = await importFiles('settings')
  const _validators: Validator[] = await importFiles('validators')

  for (const action of _actions) {
    validateActionConfig(action)
    actions[action.name] = action
  }

  for (const blockFactory of blockFactories) {
    const block = await blockFactory()

    applyFieldStubs(block.fields)
    validateBlock(block)

    if (!block.label) {
      block.label = block.label || camelToLabel(lowercaseFirstLetter(block.name))
    }

    if (!block.icon) {
      block.icon = 'components'
    }

    blocks.push(block)
  }

  if (config.presets !== false) {
    blocks.push({
      name: 'Preset',
      label: presetConfig.labels!.item!.singular,
      icon: presetConfig.icon,
      description: `${
        presetConfig.labels!.item!.plural
      } help you keep content in sync across the site`,
      fields: [
        {
          name: 'preset',
          type: 'preset',
          required: true,
          placeholder: `Select a ${lowercaseFirstLetter(presetConfig.labels!.item!.singular)}...`,
        },
      ],
    })
  }

  for (const collectionFactory of collectionFactories) {
    const collectionConfig = await collectionFactory()

    applyFieldStubs(collectionConfig.fields)
    validateCollectionConfig(collectionConfig)

    if (collectionConfig.visible === undefined) {
      collectionConfig.visible = true
    }

    if (!collectionConfig.search) {
      collectionConfig.search = []
    }

    if (!collectionConfig.labels) {
      collectionConfig.labels = {}
    }

    if (!collectionConfig.labels.title) {
      collectionConfig.labels.title = {
        singular: camelToLabel(camelize(collectionConfig.name)),
        plural: camelToLabel(camelize(collectionConfig.name)),
      }
    }

    if (!collectionConfig.labels.item) {
      collectionConfig.labels.item = { singular: 'Post', plural: 'Posts' }
    }

    if (!collectionConfig.listing) {
      collectionConfig.listing = {}
    }

    if (!collectionConfig.listing.fields) {
      collectionConfig.listing.fields = ['id', 'public', 'createdAt']
    }

    if (!collectionConfig.listing.sort) {
      collectionConfig.listing.sort = [{ field: 'createdAt', direction: 'desc' }]
    }

    if (collectionConfig.translatable === undefined) {
      collectionConfig.translatable = true
    }

    collectionsConfig[collectionConfig.name] = collectionConfig
  }

  if (config.seo !== false) {
    settingConfigs.push(
      await (await import(path.resolve(__dirname, '../base-settings/seo.js'))).default(),
    )
  }

  for (const settingFactory of settingFactories) {
    const settingConfig = await settingFactory()

    applyFieldStubs(settingConfig.fields)
    validateSettingConfig(settingConfig)

    if (settingConfig.public === undefined) {
      settingConfig.public = true
    }

    if (!settingConfig.label) {
      settingConfig.label = camelToLabel(camelize(settingConfig.group))
    }

    settingConfigs.push(settingConfig)
  }

  validateCustomFields()

  for (const validator of _validators) {
    validateValidatorConfig(validator)
    validators[validator.name] = validator
  }

  await importIcons()

  onImport()
})
