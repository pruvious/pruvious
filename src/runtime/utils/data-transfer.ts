export async function getFilesFromDataTransferItems(dataTransferItems: any, options = { raw: false }) {
  const checkErr = (err: any) => {
    if ((getFilesFromDataTransferItems as any).didShowInfo) return
    if (err.name !== 'EncodingError') return
    ;(getFilesFromDataTransferItems as any).didShowInfo = true
    const infoMsg =
      `${err.name} occured within datatransfer-files-promise module\n` +
      `Error message: "${err.message}"\n` +
      'Try serving html over http if currently you are running it from the filesystem.'
    console.warn(infoMsg)
  }

  const readFile = (entry: any, path = '') => {
    return new Promise((resolve, reject) => {
      entry.file(
        (file: any) => {
          if (!options.raw) file.filepath = path + file.name // save full path
          resolve(file)
        },
        (err: any) => {
          checkErr(err)
          reject(err)
        },
      )
    })
  }

  const dirReadEntries = (dirReader: any, path: any) => {
    return new Promise((resolve, reject) => {
      dirReader.readEntries(
        async (entries: any) => {
          let files: any = []
          for (let entry of entries) {
            const itemFiles = await getFilesFromEntry(entry, path)
            files = files.concat(itemFiles)
          }
          resolve(files)
        },
        (err: any) => {
          checkErr(err)
          reject(err)
        },
      )
    })
  }

  const readDir = async (entry: any, path: any) => {
    const dirReader = entry.createReader()
    const newPath = path + entry.name + '/'
    let files: any = []
    let newFiles: any
    do {
      newFiles = await dirReadEntries(dirReader, newPath)
      files = files.concat(newFiles)
    } while (newFiles.length > 0)
    return files
  }

  const getFilesFromEntry = async (entry: any, path = '') => {
    if (entry.isFile) {
      const file = await readFile(entry, path)
      return [file]
    }
    if (entry.isDirectory) {
      const files = await readDir(entry, path)
      return files
    }
    // throw new Error('Entry not isFile and not isDirectory - unable to get files')
  }

  let files: any = []
  let entries: any = []

  // Pull out all entries before reading them
  for (let i = 0, ii = dataTransferItems.length; i < ii; i++) {
    entries.push(dataTransferItems[i].webkitGetAsEntry())
  }

  // Recursively read through all entries
  for (let entry of entries) {
    const newFiles = await getFilesFromEntry(entry)
    files = files.concat(newFiles)
  }

  return files
}
