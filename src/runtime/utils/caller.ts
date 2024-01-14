import path from 'path'
import { resolveAppPath } from '../instances/path'

export function getCallerFile(appDirname: string) {
  let filePath: string | undefined
  const prepareStackTrace = Error.prepareStackTrace

  Error.prepareStackTrace = (_, stack) => stack

  try {
    const error = new Error() as any
    const dirPath = resolveAppPath(appDirname)

    while (error.stack.length) {
      const caller = error.stack.shift().getFileName()
      const callerDir = path.dirname(caller)

      if (callerDir === dirPath) {
        filePath = caller
        break
      }
    }
  } catch {}

  Error.prepareStackTrace = prepareStackTrace

  return filePath
}
