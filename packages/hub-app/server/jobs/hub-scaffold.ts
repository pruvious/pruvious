import { defineJob, insertInto, primaryLanguage, selectFrom, update } from '#pruvious/server'
import { scaffoldProject, templateDir, toPackageName } from 'create-pruvious'
import { relativeScaffoldLogPath, writeScaffoldLog } from '../utils/scaffoldLog'

interface Payload {
  scaffoldId: number
}

export default defineJob({
  handler: async (payload: Payload) => {
    const { scaffoldId } = payload

    const scaffoldQuery = await selectFrom('Scaffolds').where('id', '=', scaffoldId).first()

    if (!scaffoldQuery.success || !scaffoldQuery.data) {
      throw new Error(`Scaffold ${scaffoldId} not found`)
    }

    const scaffold = scaffoldQuery.data

    await update('Scaffolds')
      .set({
        status: 'running',
        startedAt: Date.now(),
        logPath: relativeScaffoldLogPath(scaffoldId),
      })
      .where('id', '=', scaffoldId)
      .run()

    await writeScaffoldLog(scaffoldId, `[hub] scaffolding "${scaffold.name}" -> ${scaffold.targetDir}`)

    try {
      const result = await scaffoldProject(
        {
          targetDir: scaffold.targetDir as string,
          projectName: toPackageName(scaffold.name as string),
          pruviousSpec: scaffold.pruviousSpec as string,
          packageManager: scaffold.packageManager as 'npm' | 'pnpm',
          language: {
            code: scaffold.languageCode as string,
            name: (scaffold.languageName as string | null) ?? (scaffold.languageCode as string),
          },
          install: Boolean(scaffold.install),
          git: false,
          force: Boolean(scaffold.force),
          templateDir,
        },
        {
          onLog: (line) => writeScaffoldLog(scaffoldId, line),
        },
      )

      if (result.installFailed) {
        await writeScaffoldLog(scaffoldId, '[hub] dependencies were not installed - finish manually before running dev')
      }

      const inserted = await insertInto('Projects')
        .values({
          name: scaffold.name as string,
          path: result.targetDir,
          language: primaryLanguage,
        })
        .returningAll()
        .run()

      if (!inserted.success || !inserted.data?.[0]) {
        const detail = inserted.success
          ? 'no row returned'
          : (inserted.runtimeError ?? JSON.stringify(inserted.inputErrors ?? {}))
        throw new Error(`Could not register the scaffolded project: ${detail}`)
      }

      const projectId = inserted.data[0].id as number

      await update('Scaffolds')
        .set({
          status: 'success',
          finishedAt: Date.now(),
          project: projectId,
        })
        .where('id', '=', scaffoldId)
        .run()

      await writeScaffoldLog(scaffoldId, `[hub] scaffold complete; registered as project #${projectId}`)

      return { scaffoldId, success: true, projectId }
    } catch (error: any) {
      const message = error?.message ?? String(error)
      await writeScaffoldLog(scaffoldId, `[hub] scaffold failed: ${message}`)
      await markFailed(scaffoldId, message)
      throw error
    }
  },
  defaultPriority: 10,
  logs: { exposePayload: true },
})

async function markFailed(scaffoldId: number, error: string): Promise<void> {
  await update('Scaffolds')
    .set({ status: 'failed', finishedAt: Date.now(), error })
    .where('id', '=', scaffoldId)
    .run()
}
