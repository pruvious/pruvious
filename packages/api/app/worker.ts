import Application from '@ioc:Adonis/Core/Application'
import Env from '@ioc:Adonis/Core/Env'
import Database from '@ioc:Adonis/Lucid/Database'
import { SettingRecord } from '@pruvious/shared'
import { Pruvious } from '@pruvious/types'
import { clearArray } from '@pruvious/utils'
import Page from 'App/Models/Page'
import Post from 'App/Models/Post'
import Preset from 'App/Models/Preset'
import Redirect from 'App/Models/Redirect'
import Role from 'App/Models/Role'
import Setting from 'App/Models/Setting'
import Sitemap from 'App/Models/Sitemap'
import Upload from 'App/Models/Upload'
import User from 'App/Models/User'
import Worker from 'App/Models/Worker'
import { getSetting, getSettings } from 'App/SettingQuery'
import { config, redirects, settingConfigs } from 'App/imports'
import { DateTime } from 'luxon'
import ms from 'ms'
import { createTypes } from './createTypes'
import { isImported } from './importer'

let _worker: Worker | undefined
let _isPrimaryWorker: boolean = false
let _resolved: boolean = false
let _initialized: boolean = false

export function worker() {
  return _worker
}

export function isPrimaryWorker() {
  return _isPrimaryWorker
}

export async function initWorker() {
  _worker = await Worker.create({})

  // Try to ignite now and every minute
  await igniteWorker()
  setInterval(async () => {
    await igniteWorker()

    if (!_resolved) {
      _resolved = true
    }

    if (!_initialized) {
      await init()
    }
  }, 60000)

  // Report every 30 seconds
  setInterval(() => {
    _worker!.updatedAt = DateTime.now()
    _worker!.save()
  }, 30000)
}

async function igniteWorker() {
  // Remove inactive workers
  await Worker.query()
    .where('updated_at', '<', DateTime.now().minus({ minute: 1 }).toSQL())
    .delete()

  if (!_isPrimaryWorker) {
    let otherWorkers = (await Worker.all()).filter((worker) => worker.id !== _worker!.id)

    // Primary worker check
    if (
      otherWorkers.every((worker) => !worker.primary && worker.createdAt <= _worker!.createdAt) ||
      Application.inDev
    ) {
      _worker!.primary = Math.max(1, Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
      await _worker!.save()
      await _worker!.refresh()
      otherWorkers = (await Worker.all()).filter((worker) => worker.id !== _worker!.id)

      // Drift
      if (
        otherWorkers.some((worker) => worker.primary > _worker!.primary) &&
        Application.inProduction
      ) {
        _worker!.primary = 0
        await _worker!.save()
        await _worker!.refresh()
      } else {
        _isPrimaryWorker = true
        _resolved = true

        // Initialize settings
        for (const settingConfig of settingConfigs) {
          for (const language of config.languages!) {
            await getSetting(settingConfig.group as any, language.code)
          }
        }

        // Check models and clear caches
        for (const model of [
          ...(await Page.all()),
          ...(await Preset.all()),
          ...(await Upload.all()),
          ...(await Post.all()),
          ...(await User.all()),
          ...(await Setting.all()),
        ]) {
          await model.check()
        }

        // Check for rare jobs now and every minute
        doRareJobs()
        setInterval(doRareJobs, 60000)

        // Check for common jobs every 5 seconds
        doCommonJobs()
        setInterval(doCommonJobs, ms(Env.get('HEARTBEAT')))

        // Clear cache in intervals
        const flushInterval = ms(Env.get('FLUSH_INTERVAL'))
        if (flushInterval > 0) {
          setInterval(async () => {
            flush({
              pageIds: new Set<number>((await Page.all()).map((page) => page.id)),
              presetIds: new Set<number>((await Preset.all()).map((preset) => preset.id)),
              uploadIds: new Set<number>((await Upload.all()).map((upload) => upload.id)),
              postIds: new Set<number>((await Post.all()).map((post) => post.id)),
              roleIds: new Set<number>((await Role.all()).map((role) => role.id)),
              userIds: new Set<number>((await User.all()).map((user) => user.id)),
              settingIds: new Set<number>((await Setting.all()).map((setting) => setting.id)),
            })
          }, flushInterval)
        }

        // Rebuild sitemap later
        await addInternalJob('rebuildSitemap')

        // Init hook
        await init()
      }
    }
  }

  // Reload redirects
  clearArray(redirects).push(
    ...(await Redirect.query().orderBy('order', 'asc').exec()).map((redirect) => ({
      match: redirect.isRegex ? new RegExp(redirect.match) : redirect.match,
      redirectTo: redirect.redirectTo,
      isPermanent: redirect.isPermanent,
      external: redirect.redirectTo.startsWith('http'),
    })),
  )
}

async function doRareJobs() {
  // Remove expired API tokens
  Database.from('api_tokens').where('expires_at', '<', DateTime.now().toSQL()).delete().exec()

  // Remove expired page previews
  Database.from('previews').where('expires_at', '<', DateTime.now().toSQL()).delete().exec()

  // Publish scheduled pages and posts
  const pageDrafts = await Page.query()
    .where('public', false)
    .andWhereNotNull('publish_date')
    .andWhere('publish_date', '<', DateTime.now().toSQL())
    .exec()

  for (const draft of pageDrafts) {
    await Page.query().where('id', draft.id).update({ public: true }).exec()
  }

  const postDrafts = await Post.query()
    .where('public', false)
    .andWhereNotNull('publish_date')
    .andWhere('publish_date', '<', DateTime.now().toSQL())
    .exec()

  for (const draft of postDrafts) {
    await Post.query().where('id', draft.id).update({ public: true }).exec()
    await addInternalJob('flush', 'Post', draft.id)
  }

  if (pageDrafts.length || postDrafts.length) {
    await addInternalJob('flushPublic')

    if (pageDrafts.length) {
      await addInternalJob('rebuildSitemap')
    }
  }
}

async function doCommonJobs() {
  const jobs = await Database.from('jobs').select('*').exec()
  const flushIds = {
    pageIds: new Set<number>(),
    presetIds: new Set<number>(),
    uploadIds: new Set<number>(),
    postIds: new Set<number>(),
    roleIds: new Set<number>(),
    userIds: new Set<number>(),
    settingIds: new Set<number>(),
  }

  await Database.from('jobs')
    .whereIn(
      'id',
      jobs.map((job) => job.id),
    )
    .delete()

  for (const job of jobs) {
    if (job.action === 'flush') {
      if (job.model === 'Page') {
        flushIds.pageIds.add(job.model_id)
      } else if (job.model === 'Preset') {
        flushIds.presetIds.add(job.model_id)
      } else if (job.model === 'Upload') {
        flushIds.uploadIds.add(job.model_id)
      } else if (job.model === 'Post') {
        flushIds.postIds.add(job.model_id)
      } else if (job.model === 'Role') {
        flushIds.roleIds.add(job.model_id)
      } else if (job.model === 'User') {
        flushIds.userIds.add(job.model_id)
      } else if (job.model === 'Setting') {
        flushIds.settingIds.add(job.model_id)
      }
    }
  }

  if (jobs.some((job) => job.action === 'flushPublic')) {
    for (const page of await Page.all()) {
      flushIds.pageIds.add(page.id)
    }

    for (const setting of await Setting.all()) {
      flushIds.settingIds.add(setting.id)
    }
  }

  await flush(flushIds)

  if (jobs.some((job) => job.action === 'rebuildSitemap') && config.seo !== false) {
    const sitemaps: Record<string, string>[] = []
    const seo: Record<string, SettingRecord['fields']> = {}

    for (const language of config.languages!) {
      seo[language.code] = (await getSettings('seo', language.code as any))!
    }

    let i: number = 0

    for (const page of await Page.query()
      .where('public', true)
      .andWhere('visible', true)
      .orderBy('path', 'asc')
      .exec()) {
      if (
        seo[page.language] &&
        seo[page.language].sitemap &&
        seo[page.language].visible &&
        page.path !== '/404' &&
        !config.languages!.some(
          (language) =>
            language.code !== config.defaultLanguage && page.path === `/${language.code}/404`,
        )
      ) {
        i++

        const sitemapIndex = Math.ceil(i / 1000) - 1
        const url = (await page.$relation('url')) as string

        if (!sitemaps[sitemapIndex]) {
          sitemaps[sitemapIndex] = {}
        }

        sitemaps[sitemapIndex][url] = page.updatedAt.toISO()
      }
    }

    for (const [index, sitemap] of sitemaps.entries()) {
      const existing = await Sitemap.findBy('index', index)
      let xml: string =
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'

      for (const [url, lastmod] of Object.entries(sitemap)) {
        xml += `<url><loc>${url
          .replace(/&/g, '&amp;')
          .replace(/'/g, '&apos;')}</loc><lastmod>${lastmod}</lastmod></url>`
      }

      xml += '</urlset>'

      if (existing) {
        existing.xml = xml
        await existing.save()
      } else {
        await Sitemap.create({ index, xml })
      }
    }

    await Sitemap.query()
      .where('index', '>', sitemaps.length - 1)
      .delete()
  }

  if (config.jobs) {
    for (const job of jobs.filter(
      (job) => !['flush', 'flushPublic', 'rebuildSitemap'].includes(job.action),
    )) {
      const callback = config.jobs.find((_job) => _job.name === job.action)?.callback

      if (callback) {
        await callback(job.payload)
      }
    }
  }
}

export async function addInternalJob(
  action: 'flush' | 'flushPublic' | 'rebuildSitemap',
  model?: 'Page' | 'Preset' | 'Upload' | 'Post' | 'Role' | 'User' | 'Setting',
  modelId?: number,
) {
  await Database.table('jobs')
    .insert({ action, model, model_id: modelId, created_at: DateTime.now().toSQL() })
    .exec()
}

/**
 * Add a job to the processing queue. The name of the job must be registered in
 * `previous.config.ts` beforehand.
 *
 * @returns whether the job was successfully added to the queue.
 */
export async function addJob(name: Pruvious.Job, payload?: string): Promise<boolean> {
  if (['flush', 'flushPublic', 'rebuildSitemap'].includes(name)) {
    return false
  }

  await Database.table('jobs').insert({ action: name, payload, created_at: DateTime.now().toSQL() })

  return true
}

/**
 * Obtain a list of jobs that are currently queued and awaiting processing.
 */
export async function getQueuedJobs(): Promise<
  { name: string; payload: string | null; createdAt: string }[]
> {
  const jobs = await Database.from('jobs')
    .whereNotIn('action', ['flush', 'flushPublic', 'rebuildSitemap'])
    .orderBy('created_at', 'asc')
    .exec()

  return jobs.map((job) => ({ name: job.action, payload: job.payload, createdAt: job.created_at }))
}

async function flush(ids: {
  pageIds: Set<number>
  presetIds: Set<number>
  uploadIds: Set<number>
  postIds: Set<number>
  roleIds: Set<number>
  userIds: Set<number>
  settingIds: Set<number>
}) {
  const flushed = {
    pageIds: new Set<number>(),
    pagePaths: new Set<string>(),
    presetIds: new Set<number>(),
    uploadIds: new Set<number>(),
    postIds: new Set<number>(),
    userIds: new Set<number>(),
    settingIds: new Set<number>(),
    settingsGroups: new Set<string>(),
  }

  for (const pageId of ids.pageIds) {
    const page = await Page.find(pageId)

    if (page) {
      await page.flush(flushed)
    }
  }

  for (const presetId of ids.presetIds) {
    const preset = await Preset.find(presetId)

    if (preset) {
      await preset.flush(flushed)
    }
  }

  for (const uploadId of ids.uploadIds) {
    const upload = await Upload.find(uploadId)

    if (upload) {
      await upload.flush(flushed)
    }
  }

  for (const postId of ids.postIds) {
    const post = await Post.find(postId)

    if (post) {
      await post.flush(flushed)
    }
  }

  for (const roleId of ids.roleIds) {
    const role = await Role.find(roleId)

    if (role) {
      await role.flush(flushed)
    }
  }

  for (const userId of ids.userIds) {
    const user = await User.find(userId)

    if (user) {
      await user.flush(flushed)
    }
  }

  for (const settingId of ids.settingIds) {
    const setting = await Setting.find(settingId)

    if (setting) {
      await setting.flush(flushed)
    }
  }

  if (
    config.onFlush &&
    (flushed.pageIds.size ||
      flushed.presetIds.size ||
      flushed.uploadIds.size ||
      flushed.postIds.size ||
      flushed.userIds.size ||
      flushed.settingIds.size)
  ) {
    await config.onFlush({
      pageIds: [...flushed.pageIds],
      pagePaths: [...flushed.pagePaths],
      presetIds: [...flushed.presetIds],
      uploadIds: [...flushed.uploadIds],
      postIds: [...flushed.postIds],
      userIds: [...flushed.userIds],
      settingIds: [...flushed.settingIds],
      settingsGroups: [...flushed.settingsGroups],
    })
  }
}

export async function init() {
  if (!_initialized && _resolved && isImported()) {
    _initialized = true

    if (Application.inDev) {
      createTypes()
    }

    if (config.onInit) {
      await config.onInit(_isPrimaryWorker)
    }
  }
}
