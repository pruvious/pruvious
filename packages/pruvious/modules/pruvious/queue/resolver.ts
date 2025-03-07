import { isDefined, kebabCase } from '@pruvious/utils'
import { colorize } from 'consola/utils'
import { useNuxt } from 'nuxt/kit'
import type { NuxtConfigLayer } from 'nuxt/schema'
import { relative } from 'pathe'
import { debug, warnWithContext } from '../debug/console'
import { reduceFileNameSegments, resolveFromLayers, type ResolveFromLayersResult } from '../utils/resolve'

/**
 * Key-value object containing job names and their definition file locations.
 */
let jobs: Record<string, ResolveFromLayersResult> | undefined

/**
 * Retrieves a key-value object containing collection job names and their definition file locations.
 * It scans the `<serverDir>/<pruvious.dir.jobs>` directories across all Nuxt layers.
 */
export function resolveJobFiles(): Record<string, ResolveFromLayersResult> {
  if (!jobs) {
    jobs = {}

    const nuxt = useNuxt()
    const duplicates: Record<string, { layer: NuxtConfigLayer; relativePath: string }> = {}

    for (const location of resolveFromLayers({
      nuxtDir: 'serverDir',
      pruviousDir: (options) => options.dir?.jobs ?? 'jobs',
      extensions: ['js', 'mjs', 'ts'],
      beforeResolve: (layer) =>
        debug(`Resolving jobs in layer <${relative(nuxt.options.workspaceDir, layer.cwd) || '.'}>`),
    })) {
      const { layer, file, base, pruviousDirNames } = location
      const jobName = reduceFileNameSegments(pruviousDirNames, base).map(kebabCase).join('/')

      if (!jobName) {
        warnWithContext(`The job file <${base}> does not have a valid name.`, [
          `Source: ${colorize('dim', file.relative)}`,
        ])
        continue
      }

      if (isDefined(duplicates[jobName]) && duplicates[jobName].layer === layer) {
        warnWithContext(`Two job files resolving to the same name \`${jobName}\`:`, [
          file.relative,
          duplicates[jobName].relativePath,
        ])
        continue
      }

      if (isDefined(jobs[jobName])) {
        debug(`Skipping job <${jobName}> as it was previously resolved in a parent layer`)
        continue
      }

      jobs[jobName] = location
      duplicates[jobName] = { layer, relativePath: file.relative }
      debug(`Resolved job \`${jobName}\` in <${file.relative}>`)
    }
  }

  return jobs
}

export function resetJobsResolver() {
  jobs = undefined
}
